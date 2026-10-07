import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { formatSlot, upcomingDates } from "@/booking/dates";
import { createHttpBookingAdapter, loginCustomer } from "@/booking/http-adapter";
import { type BookingStep, useBookingOptions } from "@/booking/use-booking-options";
import { type AppointmentResult, type BookingDraft, type Branch, type Service, type Stylist, type TimeSlot, isCompleteBookingDraft } from "@/booking/types";
import { BookingSummary, InlineError, SelectableCard, WizardAction, WizardProgress } from "@/components/booking-wizard";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

const steps = [
  { title: "Chọn chi nhánh", description: "Chọn nơi bạn muốn đến cắt tóc." },
  { title: "Chọn dịch vụ", description: "Xem dịch vụ tại chi nhánh đã chọn." },
  { title: "Chọn Stylist", description: "Chọn Stylist phù hợp với dịch vụ." },
  {
    title: "Chọn ngày và khung giờ",
    description: "Khung giờ tính từ Work Shift thực tế, trừ lịch đã đặt.",
  },
  { title: "Xem lại lịch đặt", description: "Kiểm tra lựa chọn trước khi xác nhận." }
] as const;

const initialDraft: BookingDraft = { branch: null, service: null, stylist: null, date: null, slot: null };

export default function CustomerBookingScreen() {
  const theme = useAppTheme();
  const { token: authToken, login } = useAuth();
  const dates = useMemo(() => upcomingDates(), []);
  const [step, setStep] = useState<BookingStep>(0);
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);
  const [result, setResult] = useState<AppointmentResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [email, setEmail] = useState("customer@30shine.vn");
  const [password, setPassword] = useState("Password123!");
  const submitLock = useRef(false);
  const tokenRef = useRef<string | null>(authToken);
  tokenRef.current = authToken || customerToken;
  const bookingAdapter = useMemo(() => createHttpBookingAdapter(() => tokenRef.current), []);
  const { branches, services, stylists, slots, loading, error, retry } = useBookingOptions(step, draft, bookingAdapter);

  function selectBranch(branch: Branch) {
    setDraft((current) => current.branch?.id === branch.id
      ? current
      : { branch, service: null, stylist: null, date: null, slot: null });
  }

  function selectService(service: Service) {
    setDraft((current) => current.service?.id === service.id
      ? current
      : { ...current, service, stylist: null, slot: null });
  }

  function selectStylist(stylist: Stylist) {
    setDraft((current) => current.stylist?.id === stylist.id
      ? current
      : { ...current, stylist, slot: null });
  }

  function selectDate(date: string) {
    setDraft((current) => current.date === date
      ? current
      : { ...current, date, slot: null });
  }

  function selectSlot(slot: TimeSlot) {
    setDraft((current) => ({ ...current, slot }));
  }

  function goBack() {
    if (step === 0) router.back();
    else {
      setSubmitError(null);
      setStep((current) => (current - 1) as BookingStep);
    }
  }

  async function confirm() {
    if (submitLock.current || !isCompleteBookingDraft(draft)) return;
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!tokenRef.current) {
        const token = await loginCustomer(email, password);
        tokenRef.current = token;
        setCustomerToken(token);
      }
      const appointment = await bookingAdapter.confirmBooking(draft);
      setResult(appointment);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Không thể xác nhận lúc này. Vui lòng thử lại.");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  const canContinue = !loading && !error && (
    (step === 0 && branches.some((item) => item.id === draft.branch?.id)) ||
    (step === 1 && services.some((item) => item.id === draft.service?.id)) ||
    (step === 2 && stylists.some((item) => item.id === draft.stylist?.id)) ||
    (step === 3 && Boolean(draft.date && slots.some((item) => item.id === draft.slot?.id)))
  );

  if (result) {
    return (
      <Screen key="success" eyebrow="SHINE-10 · Booking" title="Đã xác nhận lịch hẹn" description="Lịch hẹn đã được lưu trên hệ thống.">
        <Card>
          <CardTitle>Trạng thái: booked</CardTitle>
          <CardText>Mã lịch hẹn: {result.id}</CardText>
          <CardText>Lịch hẹn đã được ghi nhận. Vui lòng đến đúng giờ tại chi nhánh đã chọn.</CardText>
        </Card>
        <BookingSummary booking={result.booking} />
        <WizardAction label="Về trang chủ" onPress={() => router.replace("/(customer)/home")} />
      </Screen>
    );
  }

  return (
    <Screen key={step} eyebrow="Customer · Đặt lịch" title={steps[step].title} description={steps[step].description}>
      <WizardProgress step={step} />
      <View style={[styles.notice, { backgroundColor: theme.surfaceMuted }]}>
        <Text style={[styles.noticeText, { color: theme.textMuted }]}>
          Khung giờ hiển thị theo ca làm đã được chi nhánh xếp. Lịch chỉ được giữ sau khi bạn xác nhận.
        </Text>
      </View>

      {step === 0 ? (
        loading ? <LoadingState label="Đang tải chi nhánh..." /> : error ? <InlineError message={error} onRetry={retry} /> :
          branches.length === 0 ? <EmptyState icon="📍" title="Chưa có chi nhánh" description="Vui lòng quay lại sau." /> :
            branches.map((branch) => <SelectableCard key={branch.id} label={branch.name} detail={branch.address} selected={draft.branch?.id === branch.id} onPress={() => selectBranch(branch)} />)
      ) : null}

      {step === 1 ? (
        loading ? <LoadingState label="Đang tải dịch vụ..." /> : error ? <InlineError message={error} onRetry={retry} /> :
          services.length === 0 ? <EmptyState icon="✂️" title="Chưa có dịch vụ" description="Hãy quay lại chọn chi nhánh khác." /> :
            services.map((service) => (
              <SelectableCard key={service.id} label={service.name}
                detail={`${service.durationMinutes} phút · ${new Intl.NumberFormat("vi-VN").format(service.priceVnd)} ₫`}
                selected={draft.service?.id === service.id} onPress={() => selectService(service)} />
            ))
      ) : null}

      {step === 2 ? (
        loading ? <LoadingState label="Đang tải Stylist..." /> : error ? <InlineError message={error} onRetry={retry} /> :
          stylists.length === 0 ? <EmptyState icon="✂️" title="Chưa có Stylist" description="Hãy quay lại chọn dịch vụ hoặc chi nhánh khác." /> :
            stylists.map((stylist) => <SelectableCard key={stylist.id} label={stylist.name} selected={draft.stylist?.id === stylist.id} onPress={() => selectStylist(stylist)} />)
      ) : null}

      {step === 3 ? (
        <>
          <Card><CardTitle>Chọn ngày</CardTitle><CardText>7 ngày sắp tới, theo giờ trên thiết bị của bạn.</CardText></Card>
          <View style={styles.dates}>
            {dates.map((date) => (
              <View key={date.key} style={styles.dateItem}>
                <SelectableCard compact label={date.label} selected={draft.date === date.key} onPress={() => selectDate(date.key)} />
              </View>
            ))}
          </View>
          {!draft.date ? <Card><CardText>Chọn một ngày để xem khung giờ.</CardText></Card> :
            loading ? <LoadingState label="Đang tải khung giờ..." /> :
              error ? <InlineError message={error} onRetry={retry} /> :
                slots.length === 0 ? <EmptyState icon="🕒" title="Không có khung giờ trống" description="Chọn ngày khác hoặc quay lại chọn Stylist khác." /> :
                  slots.map((slot) => <SelectableCard key={slot.id} label={formatSlot(slot)} selected={draft.slot?.id === slot.id} onPress={() => selectSlot(slot)} />)}
        </>
      ) : null}

      {step === 4 && isCompleteBookingDraft(draft) ? (
        <>
          <BookingSummary booking={draft} />
          {!tokenRef.current ? (
            <Card>
              <CardTitle>Đăng nhập để xác nhận</CardTitle>
              <CardText>Dùng tài khoản Customer để lưu lịch hẹn của bạn.</CardText>
              <TextInput accessibilityLabel="Email Customer" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
              <TextInput accessibilityLabel="Mật khẩu Customer" autoComplete="current-password" placeholder="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
            </Card>
          ) : <Card><CardText>Đã đăng nhập Customer. Sẵn sàng xác nhận lịch hẹn.</CardText></Card>}
          {submitError ? <InlineError message={submitError} /> : null}
        </>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <WizardAction secondary label={step === 0 ? "Về trang chủ" : "Quay lại"} onPress={goBack} disabled={submitting} />
        </View>
        <View style={styles.actionItem}>
          {step === 4 ? (
            <WizardAction label={submitError ? "Thử xác nhận lại" : "Xác nhận đặt lịch"} onPress={() => { void confirm(); }}
              disabled={!isCompleteBookingDraft(draft)} loading={submitting} />
          ) : (
            <WizardAction label="Tiếp tục" onPress={() => setStep((current) => (current + 1) as BookingStep)} disabled={!canContinue} />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { borderRadius: 12, padding: 12 },
  noticeText: { fontSize: 13, lineHeight: 19 },
  dates: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dateItem: { width: "48%" },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  actionItem: { flex: 1 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 }
});
