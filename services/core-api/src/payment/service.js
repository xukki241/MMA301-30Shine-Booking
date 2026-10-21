// Payment service - SePay integration for appointment fee processing
const { BookingError, isId } = require('../booking/rules');

const codeFor = (id) => 'SHINE' + id.toUpperCase();
function createPaymentService(repository, config) {
  async function find(id) {
    if (!isId(id)) throw new BookingError(400, 'Invalid appointment id');
    const appointment = await repository.findById(id.toLowerCase());
    if (!appointment) throw new BookingError(404, 'Appointment not found');
    return appointment;
  }
  function price(appointment) {
    if (!Number.isSafeInteger(appointment.bookedPrice) || appointment.bookedPrice <= 0 || !appointment.branchId) {
      throw new BookingError(409, 'Lịch hẹn chưa có số tiền thanh toán hợp lệ');
    }
  }
  return {
    async instructions(actor, id) {
      const appointment = await find(id);
      if (actor.role !== 'customer' || actor.userId.toLowerCase() !== appointment.customerId) throw new BookingError(403, 'Không có quyền xem thanh toán');
      if (appointment.status !== 'completed') throw new BookingError(409, 'Lịch hẹn không chờ thanh toán');
      price(appointment);
      if (!config.bank || !config.accountNumber || !config.accountHolder) throw new BookingError(503, 'Chuyển khoản chưa được cấu hình');
      const content = codeFor(appointment.id);
      const params = new URLSearchParams({ acc: config.accountNumber, bank: config.bank, amount: String(appointment.bookedPrice), des: content, template: 'compact', showinfo: 'true', fullacc: 'true', holder: config.accountHolder });
      return { bank: config.bank, accountNumber: config.accountNumber, accountHolder: config.accountHolder,
        amount: appointment.bookedPrice, content, qrUrl: 'https://vietqr.app/img?' + params.toString() };
    },
    async payCash(actor, id) {
      const appointment = await find(id);
      if (actor.role !== "customer" || actor.userId.toLowerCase() !== appointment.customerId) throw new BookingError(403, "Không có quyền thanh toán lịch hẹn");
      if (appointment.status !== "completed") throw new BookingError(409, "Lịch hẹn không chờ thanh toán");
      price(appointment);
      const result = await repository.recordConfirmedPayment(appointment.id, { provider: "cash", requestId: "cash-" + appointment.id,
        amount: appointment.bookedPrice, branchId: appointment.branchId, actorId: actor.userId.toLowerCase(), actorRole: "customer" });
      if (!result) throw new BookingError(409, "Thanh toán đã thay đổi; tải lại lịch hẹn");
      return result;
    },
    async confirmCash(actor, id) {
      if (actor.role !== 'general_manager') throw new BookingError(403, 'Chỉ Manager được xác nhận tiền mặt');
      const appointment = await find(id);
      if (appointment.status !== 'completed') throw new BookingError(409, 'Lịch hẹn không chờ thanh toán');
      price(appointment);
      const result = await repository.recordConfirmedPayment(appointment.id, { provider: 'cash', requestId: 'cash-' + appointment.id,
        amount: appointment.bookedPrice, branchId: appointment.branchId, actorId: actor.userId.toLowerCase() });
      if (!result) throw new BookingError(409, 'Thanh toán đã thay đổi; tải lại lịch hẹn');
      return result;
    },
    async receiveSepay(payload) {
      if (!payload || !Number.isSafeInteger(payload.id) || payload.id < 1 || payload.transferType !== 'in' ||
        String(payload.accountNumber) !== config.accountNumber || !Number.isSafeInteger(payload.transferAmount)) return { matched: false };
      const matches = [...String(payload.content || '').toUpperCase().matchAll(/SHINE([A-F0-9]{24})/g)];
      if (matches.length !== 1) return { matched: false };
      const appointment = await repository.findById(matches[0][1].toLowerCase());
      if (!appointment || appointment.status !== 'completed' || appointment.bookedPrice !== payload.transferAmount) return { matched: false };
      const result = await repository.recordConfirmedPayment(appointment.id, { provider: 'sepay', requestId: 'sepay-' + payload.id,
        amount: payload.transferAmount, branchId: appointment.branchId, actorId: null });
      return { matched: Boolean(result), duplicate: !result };
    },
  };
}
module.exports = { createPaymentService, codeFor };
