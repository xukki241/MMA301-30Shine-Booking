import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { InlineError, WizardAction } from "@/components/booking-wizard";
import { useAppTheme } from "@/constants/theme";
import {
  completeStylistAppointment,
  getStylistTodayAppointments,
  loginStylist,
  type StylistAppointmentItem,
} from "@/booking/http-adapter";

export default function StylistTodayScreen() {
  const theme = useAppTheme();
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("stylist@30shine.vn");
  const [password, setPassword] = useState("Password123!");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<StylistAppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchAppointments = useCallback(async (authToken: string) => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const data = await getStylistTodayAppointments(authToken);
      setAppointments(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải lịch làm việc.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setToken(result.token);
      setUserEmail(result.user?.email || email);
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : "Đăng nhập thất bại.");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setUserEmail(null);
    setAppointments([]);
    setError(null);
    setActionError(null);
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
      description="Xem các lịch hẹn đã đặt và bấm Hoàn thành sau khi phục vụ xong."
    >
      <View style={styles.topControlRow}>
        <View style={styles.userBadge}>
          <Text style={styles.onlineDot}>●</Text>
          <Text style={styles.userEmailText}>{userEmail || "Stylist"}</Text>
        </View>
        <View style={styles.btnRow}>
          <Pressable style={styles.iconBtn} onPress={() => { void fetchAppointments(token); }}>
            <Text style={styles.iconBtnText}>🔄 Làm mới</Text>
          </Pressable>
          <Pressable style={[styles.iconBtn, styles.logoutBtn]} onPress={handleLogout}>
            <Text style={[styles.iconBtnText, styles.logoutBtnText]}>Đăng xuất</Text>
          </Pressable>
        </View>
      </View>

      {actionError ? <InlineError message={actionError} /> : null}

      {loading ? (
        <LoadingState label="Đang tải lịch hôm nay..." />
      ) : error ? (
        <InlineError message={error} onRetry={() => { void fetchAppointments(token); }} />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon="🪑"
          title="Hôm nay chưa có khách"
          description="Các lịch hẹn mới do khách đặt sẽ tự động xuất hiện tại đây."
        />
      ) : (
        appointments.map((item) => (
          <Card key={item.id}>
            <View style={styles.cardHeader}>
              <Text style={styles.timeText}>
                ⏰ {formatTime(item.startTime)} — {formatTime(item.endTime)}
              </Text>
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
            <CardText>Mã lịch: {item.id}</CardText>
            <CardText>Khách hàng ID: {item.customerId}</CardText>

            {item.status === "booked" ? (
              <View style={styles.actionWrap}>
                <WizardAction
                  label="✓ Đánh dấu Hoàn thành"
                  onPress={() => { void handleComplete(item.id); }}
                  loading={completingId === item.id}
                />
              </View>
            ) : item.status === "completed" ? (
              <Text style={[styles.doneNote, { color: theme.brand }]}>
                ✓ Đã hoàn thành. Chờ khách hàng thanh toán.
              </Text>
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
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  onlineDot: {
    color: "#16A34A",
    fontSize: 12,
  },
  userEmailText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  logoutBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  logoutBtnText: {
    color: "#DC2626",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  actionWrap: {
    marginTop: 12,
  },
  doneNote: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
});


