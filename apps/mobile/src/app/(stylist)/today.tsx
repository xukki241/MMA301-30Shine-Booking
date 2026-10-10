import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { InlineError, WizardAction } from "@/components/booking-wizard";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";
import {
  completeStylistAppointment,
  getStylistTodayAppointments,
  loginStylist,
  type StylistAppointmentItem,
} from "@/booking/http-adapter";

function getTodayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export default function StylistTodayScreen() {
  const theme = useAppTheme();
  const { token: contextToken, role: authRole, setAuth } = useAuth();
  const [localToken, setLocalToken] = useState<string | null>(null);
  const token = (authRole === "stylist" ? contextToken : null) || localToken;

  const [email, setEmail] = useState("stylist@30shine.vn");
  const [password, setPassword] = useState("Password123!");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<StylistAppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const todayStr = getTodayLocalDate();

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
        const data = await getStylistTodayAppointments(authToken, todayStr);
        setAppointments(data);
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : "Không thể tải lịch làm việc.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [todayStr]
  );

  useEffect(() => {
    if (token) {
      void fetchAppointments(token);
    }
  }, [token, fetchAppointments]);

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

  function formatTime(isoStr: string) {
    try {
      const date = new Date(isoStr);
      return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
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
      eyebrow="Stylist · Lịch hôm nay"
      title="Lịch phục vụ hôm nay"
      description={`Ngày: ${formatDisplayDate(todayStr)}. Bấm Hoàn thành sau khi phục vụ xong.`}
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
        <View style={styles.todayPill}>
          <Ionicons name="calendar-outline" size={14} color={theme.brand} style={{ marginRight: 6 }} />
          <Text style={[styles.todayPillText, { color: theme.brand }]}>{todayStr}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Làm mới lịch hôm nay"
          onPress={() => {
            if (token) void fetchAppointments(token, true);
          }}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={16} color={theme.textMuted} style={{ marginRight: 4 }} />
          <Text style={[styles.refreshButtonText, { color: theme.textMuted }]}>Làm mới</Text>
        </Pressable>
      </View>

      {actionError ? (
        <InlineError message={actionError} onRetry={() => setActionError(null)} />
      ) : null}

      {loading ? (
        <LoadingState label="Đang tải lịch hôm nay..." />
      ) : loadError ? (
        <InlineError message={loadError} onRetry={() => { void fetchAppointments(token); }} />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Hôm nay chưa có khách"
          description="Các lịch hẹn mới do khách đặt sẽ tự động xuất hiện tại đây khi làm mới."
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
                      item.status === "completed"
                        ? "#DCFCE7"
                        : item.status === "paid"
                        ? "#DBEAFE"
                        : item.status === "cancelled"
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
                        item.status === "completed"
                          ? "#166534"
                          : item.status === "paid"
                          ? "#1E40AF"
                          : item.status === "cancelled"
                          ? "#991B1B"
                          : "#92400E",
                    },
                  ]}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mã lịch:</Text>
              <Text style={styles.detailValue}>{item.id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Khách hàng:</Text>
              <Text style={styles.detailValue}>{item.customerId}</Text>
            </View>

            {item.status === "booked" ? (
              <View style={styles.actionWrap}>
                <WizardAction
                  label="Đánh dấu Hoàn thành"
                  onPress={() => { void handleComplete(item.id); }}
                  loading={completingId === item.id}
                />
              </View>
            ) : item.status === "completed" ? (
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
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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


