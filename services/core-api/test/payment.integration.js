const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const { createCalendarModel } = require('../src/models/stylist-calendar');
const { createBookingRepository } = require('../src/booking/mongo-repository');
const { createPaymentService } = require('../src/payment/service');

test('Mongo confirms one real payment and preserves unpaid appointment until confirmation', async (t) => {
  assert.ok(process.env.TEST_MONGODB_URI);
  const collection = 'shine_payment_test_' + randomBytes(8).toString('hex');
  const connection = mongoose.createConnection(process.env.TEST_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await connection.asPromise();
  t.after(async () => { await connection.collection(collection).drop().catch((error) => { if (error.code !== 26) throw error; }); await connection.close(); });
  const Calendar = createCalendarModel(connection, collection);
  const repository = createBookingRepository(Calendar);
  const id = new mongoose.Types.ObjectId(); const stylistId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId(); const branchId = new mongoose.Types.ObjectId();
  await Calendar.create({ _id: stylistId, appointments: [{ _id: id, customerId, stylistId, branchId,
    bookedPrice: 120000, startTime: new Date('2030-01-01T10:00:00Z'), endTime: new Date('2030-01-01T11:00:00Z'), status: 'completed' }] });
  const service = createPaymentService(repository, { bank: 'TPB', accountNumber: '00004148712', accountHolder: 'NGUYEN ANH TU', apiToken: 'test-token' });
  const instructions = await service.instructions({ role: 'customer', userId: String(customerId) }, String(id));
  assert.equal(instructions.amount, 120000);
  assert.equal((await repository.findById(String(id))).status, 'completed');
  const cash = await service.confirmCash({ role: 'general_manager', userId: String(new mongoose.Types.ObjectId()) }, String(id));
  assert.equal(cash.status, 'paid');
  await assert.rejects(service.confirmCash({ role: 'general_manager', userId: String(new mongoose.Types.ObjectId()) }, String(id)), { status: 409 });
  const saved = await repository.findById(String(id));
  assert.equal(saved.paymentAttempts.length, 1);
  assert.equal(saved.paymentAttempts[0].provider, 'cash');
});

test('Mongo credits a matching SePay transaction once', async (t) => {
  const collection = 'shine_sepay_test_' + randomBytes(8).toString('hex');
  const connection = mongoose.createConnection(process.env.TEST_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await connection.asPromise();
  t.after(async () => { await connection.collection(collection).drop().catch((error) => { if (error.code !== 26) throw error; }); await connection.close(); });
  const Calendar = createCalendarModel(connection, collection); const repository = createBookingRepository(Calendar);
  const id = new mongoose.Types.ObjectId(); const stylistId = new mongoose.Types.ObjectId();
  await Calendar.create({ _id: stylistId, appointments: [{ _id: id, customerId: new mongoose.Types.ObjectId(),
    stylistId, branchId: new mongoose.Types.ObjectId(), bookedPrice: 120000,
    startTime: new Date('2030-01-01T10:00:00Z'), endTime: new Date('2030-01-01T11:00:00Z'), status: 'completed' }] });
  const service = createPaymentService(repository, { accountNumber: '00004148712' });
  const payload = { id: 55, accountNumber: '00004148712', transferType: 'in', transferAmount: 100000,
    content: 'SHINE' + String(id).toUpperCase() };
  assert.equal((await service.receiveSepay(payload)).matched, false);
  assert.equal((await repository.findById(String(id))).status, 'completed');
  assert.equal((await service.receiveSepay({ ...payload, transferAmount: 120000 })).matched, true);
  assert.equal((await service.receiveSepay({ ...payload, transferAmount: 120000 })).matched, false);
  const saved = await repository.findById(String(id));
  assert.equal(saved.status, 'paid'); assert.equal(saved.paymentAttempts.length, 1);
  assert.equal(saved.paymentAttempts[0].provider, 'sepay');
});
