import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { Card, CardText, CardTitle, PrimaryButton, Screen } from '@/components/screen';
import { useAppTheme } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { Payment, paymentRequest } from '@/payments/api';

export default function PaymentScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { token } = useAuth();
  const theme = useAppTheme();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setPayment(null);
    setError(null);
    setLoading(true);
    async function refresh(create: boolean) {
      if (!token || !appointmentId) {
        if (active) { setError('Vui lòng đăng nhập và chọn lịch hẹn.'); setLoading(false); }
        return;
      }
      try {
        const next = await paymentRequest(token, appointmentId, create);
        if (!active) return;
        setPayment(next);
        setError(null);
        if (next.status === 'pending') timer = setTimeout(() => void refresh(false), 3000);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Mất kết nối. Vui lòng thử lại.');
      } finally { if (active) setLoading(false); }
    }
    void refresh(true);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [appointmentId, token, revision]));

  return <Screen title="Thanh toán SePay" description="Thanh toán thử nghiệm sau khi hoàn thành dịch vụ.">
    {loading ? <ActivityIndicator color={theme.brand} accessibilityLabel="Đang tạo thanh toán" /> : null}
    {error ? <Card><CardTitle>Chưa thể xác nhận thanh toán</CardTitle><CardText>{error}</CardText><PrimaryButton label="Thử lại" onPress={() => setRevision(v => v + 1)} /></Card> : null}
    {payment ? <Card>
      <CardTitle>{payment.status === 'paid' ? 'Thanh toán thành công' : 'Chờ xác nhận từ SePay'}</CardTitle>
      <Text accessibilityLiveRegion="polite" style={{ color: theme.brand, fontSize: 32, fontWeight: '800', marginVertical: 16 }}>{payment.amount.toLocaleString('vi-VN')} đ</Text>
      {payment.status === 'pending' ? <View style={{ gap: 12 }}>
        <CardText>Sandbox — không chuyển tiền thật bằng ứng dụng ngân hàng.</CardText>
        <CardText>Ngân hàng: {payment.bankCode}</CardText>
        <Text selectable style={{ color: theme.text }}>Tài khoản: {payment.accountNumber}</Text>
        <CardText>Nội dung giao dịch (sao chép chính xác):</CardText>
        <Text selectable style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>{payment.reference}</Text>
        <CardText>Trong SePay Test mode, chọn Mô phỏng giao dịch → Tiền vào. Nhập đúng tài khoản, số tiền và nội dung trên. Màn hình này tự cập nhật khi nhận xác nhận.</CardText>
        <PrimaryButton label="Mở SePay" onPress={() => { void Linking.openURL('https://my.sepay.vn').catch(() => setError('Không mở được SePay. Hãy mở my.sepay.vn trong trình duyệt.')); }} />
        <CardText>Rời màn hình không xác nhận hay hủy giao dịch; bạn có thể mở lại từ lịch hẹn.</CardText>
      </View> : <CardText>Lịch hẹn đã được cập nhật thành Đã thanh toán.</CardText>}
    </Card> : null}
    <PrimaryButton label="Về lịch hẹn" onPress={() => router.replace('/(customer)/appointments')} />
  </Screen>;
}
