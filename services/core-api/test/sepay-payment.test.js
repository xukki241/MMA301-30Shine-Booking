// Payment tests - SePay VietQR transaction creation and signature check
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPaymentService } = require('../src/payment/service');

const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const appointment = { id, customerId: 'bbbbbbbbbbbbbbbbbbbbbbbb', branchId: 'cccccccccccccccccccccccc', status: 'completed', bookedPrice: 120000 };
const config = { bank: 'VCB', accountNumber: '1234567890', accountHolder: 'TEST USER', apiToken: 'test-token' };
function service(record = async () => ({ ...appointment, status: 'paid' })) {
  return createPaymentService({ findById: async () => appointment, recordConfirmedPayment: record }, config);
}
test('completed appointment returns stable QR instructions without changing status', async () => {
  const result = await service().instructions({ role: 'customer', userId: appointment.customerId }, id);
  assert.equal(result.amount, 120000);
  assert.equal(result.content, 'SHINE' + id.toUpperCase());
  assert.match(result.qrUrl, /amount=120000/);
  assert.match(result.qrUrl, /des=SHINE/);
  assert.equal(appointment.status, 'completed');
});
test('cash requires manager confirmation', async () => {
  await assert.rejects(service().confirmCash({ role: 'customer', userId: appointment.customerId }, id), { status: 403 });
  let input;
  await service(async (_id, value) => { input = value; return { ...appointment, status: 'paid' }; }).confirmCash({ role: 'general_manager', userId: 'dddddddddddddddddddddddd' }, id);
  assert.equal(input.provider, 'cash');
});
test('SePay credits only a matching inbound transfer', async () => {
  const payload = { id: 17, accountNumber: config.accountNumber, transferType: 'in', transferAmount: 120000, content: 'SHINE' + id.toUpperCase() };
  let calls = 0;
  const result = await service(async () => { calls++; return { ...appointment, status: 'paid' }; }).receiveSepay(payload);
  assert.equal(result.matched, true);
  assert.equal(calls, 1);
  assert.equal((await service().receiveSepay({ ...payload, transferAmount: 1 })).matched, false);
});

const { createApp } = require('../src/app');
const { startHttp } = require('./booking-contract');
const jwt = require('jsonwebtoken');
test('HTTP payment endpoints display QR without a webhook and reject client self-payment', async (t) => {
  const secret = 'x'.repeat(40);
  const repository = { findById: async () => appointment };
  const base = await startHttp(t, createApp({ secret, bookingRepository: repository, payment: config,
    verifyCustomer: async () => true, verifyStaff: async () => true }));
  const token = jwt.sign({ role: 'customer', authVersion: 0 }, secret, { subject: appointment.customerId, expiresIn: 60 });
  const old = await fetch(base + '/appointments/' + id + '/pay', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'momo', outcome: 'success', requestId: 'fake-request' }) });
  assert.equal(old.status, 404);
  const qr = await fetch(base + '/appointments/' + id + '/payment-instructions', { headers: { Authorization: 'Bearer ' + token } });
  assert.equal(qr.status, 200);
  assert.equal((await qr.json()).amount, 120000);
  const webhook = await fetch(base + '/webhooks/sepay', { method: 'POST' });
  assert.equal(webhook.status, 404);
});

test('cash confirmation endpoint requires manager and records payment', async (t) => {
  const secret = 'x'.repeat(40);
  let current = { ...appointment };
  const repository = { findById: async () => current, recordConfirmedPayment: async (_id, input) => {
    current = { ...current, status: 'paid', paymentAttempts: [input] }; return current;
  } };
  const base = await startHttp(t, createApp({ secret, bookingRepository: repository, payment: config,
    verifyCustomer: async () => true, verifyStaff: async () => true }));
  const customer = jwt.sign({ role: 'customer', authVersion: 0 }, secret, { subject: appointment.customerId, expiresIn: 60 });
  const manager = jwt.sign({ role: 'general_manager', authVersion: 0 }, secret, { subject: 'dddddddddddddddddddddddd', expiresIn: 60 });
  const path = base + '/manager/appointments/' + id + '/confirm-cash';
  const denied = await fetch(path, { method: 'POST', headers: { Authorization: 'Bearer ' + customer } });
  assert.equal(denied.status, 403);
  assert.equal(current.status, 'completed');
  const paid = await fetch(path, { method: 'POST', headers: { Authorization: 'Bearer ' + manager } });
  assert.equal(paid.status, 200);
  assert.equal((await paid.json()).status, 'paid');
});


test("customer can finish own completed appointment with cash", async (t) => {
  const secret = "x".repeat(40);
  let current = { ...appointment };
  const repository = { findById: async () => current, recordConfirmedPayment: async (_id, input) => {
    current = { ...current, status: "paid", paymentAttempts: [input] }; return current;
  } };
  const base = await startHttp(t, createApp({ secret, bookingRepository: repository, payment: config,
    verifyCustomer: async () => true, verifyStaff: async () => true }));
  const token = jwt.sign({ role: "customer", authVersion: 0 }, secret, { subject: appointment.customerId, expiresIn: 60 });
  const response = await fetch(base + "/appointments/" + id + "/pay-cash",
    { method: "POST", headers: { Authorization: "Bearer " + token } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).appointment.status, "paid");
  assert.equal(current.paymentAttempts[0].provider, "cash");
  const other = jwt.sign({ role: "customer", authVersion: 0 }, secret, { subject: "eeeeeeeeeeeeeeeeeeeeeeee", expiresIn: 60 });
  const denied = await fetch(base + "/appointments/" + id + "/pay-cash",
    { method: "POST", headers: { Authorization: "Bearer " + other } });
  assert.equal(denied.status, 403);
});
