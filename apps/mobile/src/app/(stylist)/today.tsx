import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { InlineError, WizardAction } from "@/components/booking-wizard";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";
import {
  completeStylistAppointment,
  actOnStylistAppointment,
  getStylistTodayAppointments,
  getStylistProfiles,
  loginStylist,
  type StylistAppointmentItem,
} from "@/booking/http-adapter";
import { dateLabel, shiftDate, vietnamToday } from "@/stylist/date";

export default function StylistTodayScreen() {
  const theme = useAppTheme();
  const { token: contextToken, role: authRole, setAuth } = useAuth();
  const [localToken, setLocalToken] = useState<string | null>(null);
  const token = (authRole === "stylist" ? contextToken : null) || localToken;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<StylistAppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(vietnamToday);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => vietnamToday().slice(0, 7));
  const [stylistName, setStylistName] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  const todayStr = vietnamToday();

  const fetchAppointments = useCallback(
    async (authToken: string, isPullRefresh = false) => {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError(null);
      setActionError(null);
      try {
        const data = await getStylistTodayAppointments(authToken, selectedDate);
        setAppointments(data);
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : "Không thể tải lịch làm việc.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    if (token) {
      void fetchAppointments(token);
      const interval = setInterval(() => { void fetchAppointments(token); }, 30000);
      return () => clearInterval(interval);
    }
  }, [token, fetchAppointments]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void getStylistProfiles(token).then((profiles) => {
      if (active) {
        setStylistName(profiles[0]?.displayName || null);
        setBranchName(profiles[0]?.branchName || null);
      }
    }).catch(() => { if (active) setStylistName(null); });
    return () => { active = false; };
  }, [token]);

  function moveMonth(offset: number) {
    setCalendarMonth((month) => shiftDate(`${month}-01`, offset > 0 ? 32 : -1).slice(0, 7));
  }

  function chooseDate(date: string) {
    setSelectedDate(date);
    setCalendarMonth(date.slice(0, 7));
    setCalendarOpen(false);
  }

  const [year, month] = calendarMonth.split("-").map(Number);
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const monthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  async function handleLogin() {
    setLoggingIn(true);
    setLoginError(null);
    try {
      const result = await loginStylist(email, password);
      setLocalToken(result.token);
      setAuth(result.token, result.user as any);
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : "Đăng nhập thất bại.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleComplete(appointmentId: string) {
    if (!token) return;
    setCompletingId(appointmentId);
    setActionError(null);
    try {
      const updated = await completeStylistAppointment(token, appointmentId);
      setAppointments((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item))
      );
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể đánh dấu hoàn thành.");
    } finally {
      setCompletingId(null);
    }
  }

  async function handleAction(appointmentId: string, action: "check_in" | "undo_check_in" | "no_show") {
    if (!token) return;
    setCompletingId(appointmentId);
    setActionError(null);
    try {
      const updated = await actOnStylistAppointment(token, appointmentId, action);
      setAppointments((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không cập nhật được lịch.");
    } finally { setCompletingId(null); }
  }

  function confirmNoShow(id: string) {
    Alert.alert("Xác nhận khách không đến", "Hãy kiểm tra khách không đang chờ tại salon.", [
      { text: "Quay lại", style: "cancel" },
      { text: "Khách không đến", style: "destructive", onPress: () => { void handleAction(id, "no_show"); } },
    ]);
  }

  function formatTime(isoStr: string) {
    try {
      const date = new Date(isoStr);
      return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
    } catch {
      return isoStr;
    }
  }

  if (!token) {
    return (
      <Screen
        eyebrow="Stylist · Đăng nhập"
        title="Lịch làm việc Stylist"
        description="Đăng nhập bằng tài khoản Stylist để xem lịch cắt và đánh dấu hoàn thành."
      >
        <Card>
          <CardTitle>Đăng nhập Stylist</CardTitle>
          <CardText>Nhập email và mật khẩu tài khoản Stylist đã được phân công.</CardText>
          <TextInput
            accessibilityLabel="Email Stylist"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email Stylist"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Mật khẩu Stylist"
            autoComplete="current-password"
            placeholder="Mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          {loginError ? <InlineError message={loginError} /> : null}
          <View style={styles.loginBtn}>
            <WizardAction
              label="Đăng nhập Stylist"
              onPress={() => { void handleLogin(); }}
              loading={loggingIn}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow={branchName || "Lịch làm việc · Stylist"}
      title={stylistName ? `Xin chào, ${stylistName}` : "Lịch làm việc"}
      description="Chọn ngày để xem lịch hẹn và cập nhật trạng thái khách."
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            if (token) void fetchAppointments(token, true);
          }}
          colors={[theme.brand]}
          tintColor={theme.brand}
        />
      }
    >
      <View style={styles.topControlRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn ngày xem lịch"
          onPress={() => { setCalendarMonth(selectedDate.slice(0, 7)); setCalendarOpen(true); }} style={styles.dateButton}>
          <Ionicons name="calendar-outline" size={18} color={theme.brand} />
          <View><Text style={styles.dateCaption}>LỊCH NGÀY</Text>
            <Text style={styles.dateValue}>{dateLabel(selectedDate, { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}</Text></View>
          <Ionicons name="chevron-down" size={16} color={theme.brand} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Làm mới lịch"
          onPress={() => {
            if (token) void fetchAppointments(token, true);
          }}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={16} color={theme.textMuted} style={{ marginRight: 4 }} />
          <Text style={[styles.refreshButtonText, { color: theme.textMuted }]}>Làm mới</Text>
        </Pressable>
      </View>
      <View style={styles.dayStrip}>
        {Array.from({ length: 7 }, (_, index) => shiftDate(selectedDate, index - 3)).map((date) => (
          <Pressable key={date} accessibilityRole="button" accessibilityLabel={`Xem lịch ${date}`}
            onPress={() => setSelectedDate(date)} style={[styles.dayChip, date === selectedDate && { backgroundColor: theme.brand }]}>
            <Text style={[styles.dayWeek, date === selectedDate && styles.selectedDayText]}>{dateLabel(date, { weekday: "short" })}</Text>
            <Text style={[styles.dayNumber, date === selectedDate && styles.selectedDayText]}>{date.slice(-2)}</Text>
            {date === todayStr && <View style={[styles.todayDot, date === selectedDate && { backgroundColor: "#fff" }]} />}
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Lịch hẹn · {appointments.length}</Text>
        {selectedDate !== todayStr && <Pressable onPress={() => chooseDate(todayStr)}><Text style={{ color: theme.brand, fontWeight: "700" }}>Về hôm nay</Text></Pressable>}</View>

      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <View style={styles.modalOverlay}><View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable accessibilityLabel="Tháng trước" onPress={() => moveMonth(-1)}><Ionicons name="chevron-back" size={24} color={theme.brand} /></Pressable>
            <Text style={styles.calendarTitle}>{dateLabel(`${calendarMonth}-01`, { month: "long", year: "numeric" })}</Text>
            <Pressable accessibilityLabel="Tháng sau" onPress={() => moveMonth(1)}><Ionicons name="chevron-forward" size={24} color={theme.brand} /></Pressable>
          </View>
          <View style={styles.calendarGrid}>
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}
            {Array.from({ length: firstWeekday }, (_, index) => <View key={`empty-${index}`} style={styles.calendarCell} />)}
            {Array.from({ length: monthDays }, (_, index) => {
              const date = `${calendarMonth}-${String(index + 1).padStart(2, "0")}`;
              return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`Chọn ${date}`} onPress={() => chooseDate(date)}
                style={[styles.calendarCell, date === selectedDate && { backgroundColor: theme.brand, borderRadius: 22 }]}>
                <Text style={[styles.calendarDay, date === selectedDate && { color: "#fff" }, date === todayStr && date !== selectedDate && { color: theme.brand, fontWeight: "800" }]}>{index + 1}</Text>
              </Pressable>;
            })}
          </View>
          <Pressable onPress={() => chooseDate(todayStr)} style={styles.calendarToday}><Text style={{ color: theme.brand, fontWeight: "700" }}>Hôm nay</Text></Pressable>
          <Pressable onPress={() => setCalendarOpen(false)} style={styles.calendarClose}><Text style={{ color: theme.textMuted }}>Đóng</Text></Pressable>
        </View></View>
      </Modal>

      {actionError ? (
        <InlineError message={actionError} onRetry={() => setActionError(null)} />
      ) : null}

      {loading ? (
        <LoadingState label="Đang tải lịch hẹn..." />
      ) : loadError ? (
        <InlineError message={loadError} onRetry={() => { void fetchAppointments(token); }} />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Ngày này chưa có lịch hẹn"
          description="Hãy chọn ngày khác để xem lịch phục vụ."
        />
      ) : (
        appointments.map((item) => (
          <Card key={item.id}>
            <View style={styles.cardHeader}>
              <View style={styles.timeRow}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={theme.brand}
                  style={styles.timeIcon}
                />
                <Text style={styles.timeText}>
                  {formatTime(item.startTime)} - {formatTime(item.endTime)}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      item.status === "completed" || item.status === "checked_in"
                        ? "#DCFCE7"
                        : item.status === "paid"
                        ? "#DBEAFE"
                      : item.status === "cancelled" || item.status === "no_show"
                        ? "#FEE2E2"
                        : "#FEF3C7",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        item.status === "completed" || item.status === "checked_in"
                          ? "#166534"
                          : item.status === "paid"
                          ? "#1E40AF"
                          : item.status === "cancelled" || item.status === "no_show"
                          ? "#991B1B"
                          : "#92400E",
                    },
                  ]}
                >
                  {({ booked: "Đã đặt", checked_in: "Đã đến", completed: "Hoàn thành", paid: "Đã trả",
                    cancelled: "Đã hủy", no_show: "Không đến" } as const)[item.status]}
                </Text>
              </View>
            </View>

            <Text style={styles.customerName}>{item.customerName || item.customerPhone || "Khách hàng"}</Text>
            <View style={styles.serviceRow}><Ionicons name="cut-outline" size={17} color={theme.brand} />
              <Text style={styles.serviceText}>{item.serviceName || "Dịch vụ chưa cập nhật"}</Text></View>
            {item.branchName ? <View style={styles.serviceRow}><Ionicons name="location-outline" size={16} color={theme.textMuted} />
              <Text style={styles.branchText}>{item.branchName}</Text></View> : null}

            {item.wishes?.specialRequest?.trim() || item.wishes?.stylistPreference?.trim() ? (
              <View style={styles.requestBox}>
                <View style={styles.requestHeading}><Ionicons name="chatbox-ellipses-outline" size={16} color={theme.brand} />
                  <Text style={styles.requestTitle}>Yêu cầu của khách</Text></View>
                {item.wishes.specialRequest?.trim() ?
                  <Text style={styles.requestText}>{item.wishes.specialRequest.trim()}</Text> : null}
                {item.wishes.stylistPreference?.trim() ?
                  <Text style={styles.requestSecondary}>Mong muốn về thợ: {item.wishes.stylistPreference.trim()}</Text> : null}
              </View>
            ) : null}

            {item.status === "booked" ? (
              <View style={styles.actionWrap}>
                <WizardAction
                  label="Khách đã đến"
                  onPress={() => { void handleAction(item.id, "check_in"); }}
                  loading={completingId === item.id}
                />
                {Date.now() >= new Date(item.startTime).getTime() + 15 * 60000 && <>
                  <Text style={{ color: theme.danger, marginTop: 8 }}>Quá 15 phút, chưa ghi nhận khách đến. Hãy kiểm tra.</Text>
                  <WizardAction label="Khách không đến" onPress={() => confirmNoShow(item.id)}
                    loading={completingId === item.id} />
                </>}
              </View>
            ) : item.status === "checked_in" ? <View style={styles.actionWrap}>
              <Text style={{ color: theme.textMuted, marginBottom: 8 }}>Khách đã đến, có thể đang chờ thợ.</Text>
              <WizardAction label="Đánh dấu Hoàn thành" onPress={() => { void handleComplete(item.id); }}
                loading={completingId === item.id} />
              {item.checkedInAt && Date.now() - new Date(item.checkedInAt).getTime() <= 5 * 60000 &&
                <Pressable onPress={() => Alert.alert("Hoàn tác check-in?", "Chỉ dùng khi bấm nhầm khách đã đến.", [
                  { text: "Giữ nguyên", style: "cancel" },
                  { text: "Hoàn tác", onPress: () => { void handleAction(item.id, "undo_check_in"); } },
                ])}>
                  <Text style={{ color: theme.brand, marginTop: 10 }}>Hoàn tác check-in</Text>
                </Pressable>}
            </View> : item.status === "completed" ? (
              <View style={styles.statusBoxSuccess}>
                <Ionicons name="checkmark-circle" size={16} color="#166534" style={{ marginRight: 6 }} />
                <Text style={styles.statusNoteSuccess}>
                  Đã hoàn thành. Chờ khách hàng thanh toán.
                </Text>
              </View>
            ) : item.status === "paid" ? (
              <View style={styles.statusBoxInfo}>
                <Ionicons name="wallet-outline" size={16} color="#1E40AF" style={{ marginRight: 6 }} />
                <Text style={styles.statusNoteInfo}>
                  Khách hàng đã thanh toán.
                </Text>
              </View>
            ) : item.status === "cancelled" ? (
              <View style={styles.statusBoxDanger}>
                <Ionicons name="close-circle-outline" size={16} color="#991B1B" style={{ marginRight: 6 }} />
                <Text style={styles.statusNoteDanger}>
                  Lịch hẹn đã bị hủy.
                </Text>
              </View>
            ) : item.status === "no_show" ? <View style={styles.noShowBox}>
              <Ionicons name="information-circle-outline" size={19} color="#9A3412" />
              <View style={{ flex: 1 }}><Text style={styles.noShowTitle}>Đã ghi nhận khách không đến</Text>
                <Text style={styles.noShowDescription}>Nếu cần điều chỉnh, hãy liên hệ Manager.</Text></View>
            </View> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateButton: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 12,
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDE5EF", borderRadius: 14 },
  dateCaption: { color: "#64748B", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  dateValue: { color: "#142443", fontSize: 13, fontWeight: "800", textTransform: "capitalize" },
  dayStrip: { flexDirection: "row", marginHorizontal: 16, gap: 4, justifyContent: "space-between" },
  dayChip: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 12, minHeight: 58 },
  dayWeek: { color: "#64748B", fontSize: 11, fontWeight: "600" },
  dayNumber: { color: "#142443", fontSize: 15, fontWeight: "800", marginTop: 2 },
  selectedDayText: { color: "#FFFFFF" },
  todayDot: { backgroundColor: "#1E3155", width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 18, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#142443" },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0F172A99" },
  calendarCard: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  calendarTitle: { fontSize: 17, fontWeight: "800", color: "#142443", textTransform: "capitalize" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarWeekday: { width: "14.2857%", textAlign: "center", fontSize: 12, fontWeight: "700", color: "#64748B", paddingVertical: 7 },
  calendarCell: { width: "14.2857%", height: 42, alignItems: "center", justifyContent: "center" },
  calendarDay: { fontSize: 14, color: "#142443", fontWeight: "600" },
  calendarToday: { alignSelf: "center", padding: 10, marginTop: 12 },
  calendarClose: { alignSelf: "center", padding: 8 },
  customerName: { color: "#142443", fontSize: 18, fontWeight: "800", marginTop: 4 },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  serviceText: { color: "#233655", fontSize: 14, fontWeight: "700", flex: 1 },
  branchText: { color: "#64748B", fontSize: 12, flex: 1 },
  requestBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#F2F6FC", gap: 6 },
  requestHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  requestTitle: { fontSize: 12, fontWeight: "800", color: "#1E3155" },
  requestText: { color: "#233655", fontSize: 13, lineHeight: 19, marginLeft: 23 },
  requestSecondary: { color: "#526682", fontSize: 12, lineHeight: 18, marginLeft: 23 },
  noShowBox: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 9,
    padding: 12, borderRadius: 12, backgroundColor: "#FFF7ED" },
  noShowTitle: { color: "#9A3412", fontSize: 13, fontWeight: "800" },
  noShowDescription: { color: "#7C4A32", fontSize: 12, lineHeight: 18, marginTop: 3 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  loginBtn: {
    marginTop: 14,
  },
  topControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginHorizontal: 16,
  },
  todayPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  todayPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeIcon: {
    marginRight: 6,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: "#64748B",
    width: 90,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  actionWrap: {
    marginTop: 14,
  },
  statusBoxSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  statusNoteSuccess: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
    flex: 1,
  },
  statusBoxInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  statusNoteInfo: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E40AF",
    flex: 1,
  },
  statusBoxDanger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  statusNoteDanger: {
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B",
    flex: 1,
  },
});


