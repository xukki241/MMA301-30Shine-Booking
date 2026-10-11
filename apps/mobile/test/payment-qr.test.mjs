import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentQrUrl } from '../src/payments/qr.ts';

test('QR includes the exact server-issued account, amount and reference', () => {
  const url = new URL(paymentQrUrl({ accountNumber: '0000000001', bankCode: 'MB', amount: 10000, reference: 'SHINEABC123' }));
  assert.equal(url.origin, 'https://vietqr.app');
  assert.equal(url.searchParams.get('acc'), '0000000001');
  assert.equal(url.searchParams.get('bank'), 'MB');
  assert.equal(url.searchParams.get('amount'), '10000');
  assert.equal(url.searchParams.get('des'), 'SHINEABC123');
  assert.equal(url.searchParams.get('template'), 'qronly');
});

test('reference is encoded without introducing extra QR parameters', () => {
  const url = new URL(paymentQrUrl({ accountNumber: '001', bankCode: 'MB', amount: 1000, reference: 'A&B=1' }));
  assert.equal(url.searchParams.get('des'), 'A&B=1');
  assert.equal(url.searchParams.has('B'), false);
});
