import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Linking, Text, View } from 'react-native';
import { Card, CardText, CardTitle, PrimaryButton, Screen } from '@/components/screen';
import { useAppTheme } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { Payment, paymentRequest } from '@/payments/api';
import { paymentQrUrl } from '@/payments/qr';

export default function PaymentScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { token } = useAuth();
  const theme = useAppTheme();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qrState, setQrState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [qrRevision, setQrRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setPayment(null);
    setError(null);
    setLoading(true);
    setQrState('loading');
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
        <CardTitle>Mã VietQR thử nghiệm</CardTitle>
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 280, aspectRatio: 1, backgroundColor: '#FFFFFF', padding: 12 }}>
          <Image
            key={`${payment.reference}-${qrRevision}`}
            source={{ uri: paymentQrUrl(payment) }}
            accessibilityLabel={`Mã VietQR thử nghiệm, ${payment.amount} đồng, nội dung ${payment.reference}`}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            onLoad={() => setQrState('ready')}
            onError={() => setQrState('error')}
          />
          {qrState === 'loading' ? <ActivityIndicator accessibilityLabel="Đang tải mã QR" style={{ position: 'absolute', alignSelf: 'center', top: '45%' }} color={theme.brand} /> : null}
        </View>
        {qrState === 'error' ? <View style={{ gap: 8 }}><CardText>Không tải được mã QR. Bạn vẫn có thể dùng thông tin bên dưới.</CardText><PrimaryButton label="Tải lại mã QR" onPress={() => { setQrState('loading'); setQrRevision(v => v + 1); }} /></View> : null}
        <CardText>QR đã điền sẵn tài khoản, số tiền và nội dung. Đây là tài khoản sandbox: app ngân hàng thật không thể chuyển tiền. Dùng mô phỏng chuyển khoản trong SePay để xác nhận.</CardText>
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
