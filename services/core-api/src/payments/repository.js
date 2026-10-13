const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const { BookingError, isId } = require('../booking/rules');

function createPaymentRepository({ Calendar, Service }, config) {
  const receiptSchema = new mongoose.Schema({
    transactionId: { type: String, required: true, unique: true },
    appointmentId: { type: String, required: true },
    reference: String, amount: Number, accountNumber: String,
  }, { timestamps: true });
  const receipts = Calendar.db.models.SePayReceipt || Calendar.db.model('SePayReceipt', receiptSchema);
  async function find(id) {
    const calendar = await Calendar.findOne({ 'appointments._id': id }, { appointments: { $elemMatch: { _id: new mongoose.Types.ObjectId(id) } } }).lean();
    return calendar?.appointments[0];
  }
  async function owned(id, actor) {
    if (!isId(id)) throw new BookingError(400, 'Invalid appointment id');
    const appointment = await find(id);
    if (!appointment) throw new BookingError(404, 'Appointment not found');
    if (actor.role !== 'customer' || String(appointment.customerId) !== actor.userId.toLowerCase()) throw new BookingError(403, 'This appointment belongs to another customer');
    return appointment;
  }
  const publicPayment = (appointment) => appointment.payment ? { ...appointment.payment, appointmentId: String(appointment._id), mode: 'sandbox' } : null;
  return {
    receipts,
    init: () => receipts.init(),
    async get(id, actor) { return publicPayment(await owned(id, actor)); },
    async sandboxOutcome(id, actor, status) {
      if (!['pending', 'failed', 'cancelled'].includes(status)) throw new BookingError(400, 'Invalid sandbox outcome');
      const appointment = await owned(id, actor);
      if (!appointment.payment || appointment.status !== 'completed') throw new BookingError(409, 'Payment cannot be changed');
      const result = await Calendar.updateOne({ appointments: { $elemMatch: { _id: id, customerId: actor.userId, status: 'completed', 'payment.status': { $in: ['pending', 'failed', 'cancelled'] } } } }, { $set: { 'appointments.$.payment.status': status } }, { runValidators: true });
      if (!result.matchedCount) throw new BookingError(409, 'Payment changed; refresh and retry');
      return publicPayment(await find(id));
    },
    async create(id, actor) {
      const appointment = await owned(id, actor);
      if (appointment.payment) return publicPayment(appointment);
      if (appointment.status !== 'completed') throw new BookingError(409, 'Only completed appointments can be paid');
      if (!appointment.serviceId) throw new BookingError(409, 'Appointment has no priced service');
      const service = await Service.findById(appointment.serviceId).lean();
      if (!service || !Number.isSafeInteger(service.price) || service.price <= 0 || String(service.branchId) !== String(appointment.branchId)) throw new BookingError(409, 'Appointment service price is unavailable');
      const payment = { reference: 'SHINE' + randomBytes(8).toString('hex').toUpperCase(), amount: service.price, accountNumber: config.accountNumber, bankCode: config.bankCode, status: 'pending', createdAt: new Date() };
      // Payment creation races converge on one immutable reference and server price.
      await Calendar.updateOne({ appointments: { $elemMatch: { _id: id, customerId: actor.userId, status: 'completed', payment: { $exists: false } } } }, { $set: { 'appointments.$.payment': payment } }, { runValidators: true });
      const result = await find(id);
      if (!result?.payment) throw new BookingError(409, 'Appointment changed; refresh and retry');
      return publicPayment(result);
    },
    async receive(event) {
      if (!event || !Number.isSafeInteger(event.id) || event.id <= 0 || !Number.isSafeInteger(event.transferAmount) || event.transferAmount <= 0) throw new BookingError(400, 'Invalid SePay transaction');
      const gateway = config.gateway || (config.bankCode === 'MB' ? 'MBBank' : config.bankCode);
      if (event.transferType !== 'in' || event.accountNumber !== config.accountNumber || String(event.gateway || '').toLowerCase() !== gateway.toLowerCase()) return;
      const references = String(event.content || '').toUpperCase().match(/\bSHINE[A-F0-9]{16}\b/g) || [];
      if (typeof event.code === 'string' && /^SHINE[A-F0-9]{16}$/.test(event.code.toUpperCase())) references.push(event.code.toUpperCase());
      const unique = [...new Set(references)];
      if (unique.length !== 1) return;
      const reference = unique[0];
      const calendar = await Calendar.findOne({ 'appointments.payment.reference': reference }).lean();
      const appointment = calendar?.appointments.find(a => a.payment?.reference === reference);
      if (!appointment || appointment.payment.amount !== event.transferAmount || appointment.payment.accountNumber !== event.accountNumber) return;
      const transactionId = String(event.id);
      // Reserve the provider transaction globally. Retries repair a crash between
      // receipt creation and the single-document appointment/payment update.
      let receipt;
      try {
        receipt = await receipts.findOneAndUpdate({ transactionId }, { $setOnInsert: { appointmentId: String(appointment._id), reference, amount: event.transferAmount, accountNumber: event.accountNumber } }, { upsert: true, returnDocument: 'after', runValidators: true }).lean();
      } catch (error) {
        if (error.code !== 11000) throw error;
        receipt = await receipts.findOne({ transactionId }).lean();
      }
      if (!receipt || receipt.reference !== reference || receipt.amount !== event.transferAmount || receipt.accountNumber !== event.accountNumber) throw new BookingError(409, 'Transaction already assigned');
      // One atomic Mongo write changes BOTH appointment and embedded payment.
      await Calendar.updateOne({ _id: calendar._id, appointments: { $elemMatch: { _id: appointment._id, status: 'completed', 'payment.reference': reference, 'payment.status': { $in: ['pending', 'failed', 'cancelled'] } } } }, { $set: {
        'appointments.$.status': 'paid', 'appointments.$.updatedAt': new Date(),
        'appointments.$.payment.status': 'paid', 'appointments.$.payment.paidAt': new Date(), 'appointments.$.payment.transactionId': transactionId,
      } }, { runValidators: true });
    },
  };
}
module.exports = { createPaymentRepository };
