const test = require('node:test');
const assert = require('node:assert/strict');
const { createSepayPoller, normalizeTransaction } = require('../src/payment/poller');
const { createPaymentService } = require('../src/payment/service');

const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const config = { bank: 'TPB', accountNumber: '00004148712', accountHolder: 'NGUYEN ANH TU', apiToken: 'local-test-token' };
const appointment = { id, customerId: 'bbbbbbbbbbbbbbbbbbbbbbbb', branchId: 'cccccccccccccccccccccccc', status: 'completed', bookedPrice: 50000 };

test('API-only configuration still displays transfer instructions', async () => {
  const service = createPaymentService({ findById: async () => appointment }, config);
  const instructions = await service.instructions({ role: 'customer', userId: appointment.customerId }, id);
  assert.equal(instructions.content, 'SHINE' + id.toUpperCase());
});

test('normalizes only inbound whole-VND transactions', () => {
  const base = { id: '95400935', account_number: config.accountNumber, amount_in: '50000.00', amount_out: '0.00', transaction_content: 'SHINE' + id.toUpperCase() };
  assert.deepEqual(normalizeTransaction(base), { id: 95400935, accountNumber: config.accountNumber, transferType: 'in', transferAmount: 50000, content: base.transaction_content });
  assert.equal(normalizeTransaction({ ...base, amount_in: '50000.25' }), null);
  assert.equal(normalizeTransaction({ ...base, amount_out: '50000.00' }), null);
  assert.equal(normalizeTransaction({ ...base, id: 'bad' }), null);
});

test('polls SePay with token and credits only the exact matching appointment', async () => {
  let current = { ...appointment };
  let recorded = [];
  const repository = { findById: async () => current, recordConfirmedPayment: async (_id, value) => {
    if (current.status !== 'completed') return null;
    recorded.push(value); current = { ...current, status: 'paid' }; return current;
  } };
  let requestedUrl; let requestedAuth;
  const poller = createSepayPoller(createPaymentService(repository, config), config, {
    now: () => new Date('2026-11-02T05:00:00Z'),
    fetchImpl: async (url, options) => {
      requestedUrl = url; requestedAuth = options.headers.Authorization;
      return { ok: true, json: async () => ({ status: 200, messages: { success: true }, transactions: [
        { id: '10', account_number: 'other', amount_in: '50000.00', amount_out: '0.00', transaction_content: 'SHINE' + id.toUpperCase() },
        { id: '11', account_number: config.accountNumber, amount_in: '40000.00', amount_out: '0.00', transaction_content: 'SHINE' + id.toUpperCase() },
        { id: '12', account_number: config.accountNumber, amount_in: '50000.00', amount_out: '0.00', transaction_content: 'SHINE' + id.toUpperCase() },
      ] }) };
    },
  });
  await poller.poll();
  assert.equal(requestedUrl.searchParams.get('account_number'), config.accountNumber);
  assert.equal(requestedUrl.searchParams.get('transaction_date_min'), '2026-10-26');
  assert.equal(requestedAuth, 'Bearer local-test-token');
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].requestId, 'sepay-12');
  await poller.poll();
  assert.equal(recorded.length, 1);
});
