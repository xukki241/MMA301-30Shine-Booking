import { CORE_API_URL } from '@/constants/config';

export type Payment = {
  appointmentId: string;
  reference: string;
  amount: number;
  accountNumber: string;
  bankCode: string;
  mode: 'sandbox';
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  paidAt?: string;
};

export async function paymentRequest(token: string, appointmentId: string, create = false, outcome?: 'pending' | 'failed' | 'cancelled'): Promise<Payment> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const path = outcome ? `/payments/${encodeURIComponent(appointmentId)}/sandbox-outcome` : create ? '/payments' : '/payments/' + encodeURIComponent(appointmentId);
    const response = await fetch(`${CORE_API_URL}${path}`, {
      method: create || outcome ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...(outcome ? { body: JSON.stringify({ status: outcome }) } : create ? { body: JSON.stringify({ appointmentId }) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không thể tải thanh toán.');
    return data.payment;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Kết nối quá hạn. Vui lòng thử lại.');
    throw error;
  } finally { clearTimeout(timeout); }
}
