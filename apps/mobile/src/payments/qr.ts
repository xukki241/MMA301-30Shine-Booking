type QrPayment = { accountNumber: string; bankCode: string; amount: number; reference: string };

export function paymentQrUrl(payment: QrPayment): string {
  const params = new URLSearchParams({
    acc: payment.accountNumber,
    bank: payment.bankCode,
    amount: String(payment.amount),
    des: payment.reference,
    template: 'qronly',
  });
  return `https://vietqr.app/img?${params.toString()}`;
}
