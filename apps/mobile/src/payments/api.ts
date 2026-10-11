import { CORE_API_URL } from '@/constants/config';

export type Payment = {
  appointmentId: string;
  reference: string;
  amount: number;
  accountNumber: string;
  bankCode: string;
  mode: 'sandbox';
  status: 'pending' | 'paid';
  paidAt?: string;
};

export async function paymentRequest(token: string, appointmentId: string, create = false): Promise<Payment> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${CORE_API_URL}${create ? '/payments' : '/payments/' + encodeURIComponent(appointmentId)}`, {
      method: create ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...(create ? { body: JSON.stringify({ appointmentId }) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không thể tải thanh toán.');
    return data.payment;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Kết nối quá hạn. Vui lòng thử lại.');
    throw error;
  } finally { clearTimeout(timeout); }
}
