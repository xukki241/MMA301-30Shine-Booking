import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { createCoreApiAppointmentDataSource } from "@/appointments/core-api-adapter";
import { demoAppointmentDataSource } from "@/appointments/demo-adapter";
import type { CustomerAppointment, CustomerAppointmentDataSource } from "@/appointments/types";
import { InlineError, WizardAction } from "@/components/booking-wizard";
import { Card, CardText, CardTitle, PrimaryButton, Screen } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { useAppTheme } from "@/constants/theme";
import { type AppointmentSummary, isAppointmentSummary } from "@/offline/appointments";
import { useConnectivity } from "@/offline/network-provider";
import { type ReadResult, readCachedList } from "@/offline/read-cache";
import { useAuth } from "@/providers/auth-provider";

const cacheKey = "shine:customer-appointments:v2";
const statusLabels: Record<CustomerAppointment["status"], string> = {
  booked: "Đã đặt",
  completed: "Đã hoàn thành",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy",
};

function formattedTime(value: string): string {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return value;
  }
}

export default function CustomerAppointmentsScreen() {
  const theme = useAppTheme();
  const connectivity = useConnectivity();
  const { token, user, login } = useAuth();

  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  // Quick inline login state if not logged in yet
  const [email, setEmail] = useState("customer@30shine.vn");
  const [password, setPassword] = useState("Password123!");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isDemo = process.env.EXPO_PUBLIC_USE_DEMO_API === "true";

  const dataSource: CustomerAppointmentDataSource = useMemo(() => {
    if (isDemo) return demoAppointmentDataSource;
    return createCoreApiAppointmentDataSource(
      () => token,
      () => user?.id
    );
  }, [isDemo, token, user?.id]);

  const fetchItems = useCallback(async (): Promise<AppointmentSummary[]> => {
    if (!token && !isDemo) return [];
    const items = await dataSource.list();
    return items.map((item) => ({
      id: item.id,
      startTime: item.startTime,
      status: item.status,
    }));
  }, [dataSource, token, isDemo]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setActionError(null);
      setConfirmingCancelId(null);

      if (!token && !isDemo) {
        setAppointments([]);
        setLoading(false);
        return () => { active = false; };
      }

      setLoading(true);
      setLoadError(null);

      void readCachedList(connectivity, cacheKey, AsyncStorage, isAppointmentSummary, fetchItems)
        .then((next: ReadResult<AppointmentSummary>) => {
          if (!active) return;
          if (next.kind === "fresh" || next.kind === "cached") {
            setAppointments(next.items as CustomerAppointment[]);
          } else if (next.kind === "offline-empty") {
            setAppointments([]);
          } else if (next.kind === "error") {
            setLoadError("Không thể tải lịch hẹn. Vui lòng thử lại.");
          }
        })
        .catch(() => {
          if (active) setLoadError("Không thể tải lịch hẹn.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => { active = false; };
    }, [connectivity, revision, token, isDemo, fetchItems])
  );

  async function handleLogin() {
    setLoggingIn(true);
    setLoginError(null);
    try {
      await login(email, password);
      setRevision((prev) => prev + 1);
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : "Đăng nhập thất bại.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleCancel(id: string) {
    setProcessingId(id);
    setActionError(null);
    try {
      const updated = await dataSource.cancel(id);
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: updated.status } : item))
      );
      setConfirmingCancelId(null);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể hủy lịch hẹn.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handlePay(id: string) {
    if (!dataSource.pay) return;
    setProcessingId(id);
    setActionError(null);
    try {
      const updated = await dataSource.pay(id);
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: updated.status } : item))
      );
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể thanh toán.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <Screen
      eyebrow="Customer · Lịch hẹn"
      title="Lịch hẹn của tôi"
      description="Theo dõi lịch hẹn, hủy lịch đã đặt hoặc thanh toán sau khi hoàn thành."
    >
      {!token && !isDemo ? (
        <Card>
          <CardTitle>Đăng nhập tài khoản Customer</CardTitle>
          <CardText>Vui lòng đăng nhập để xem danh sách lịch hẹn của bạn.</CardText>
          <TextInput
            accessibilityLabel="Email Customer"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email Customer"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Mật khẩu Customer"
            autoComplete="current-password"
            placeholder="Mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          {loginError ? <InlineError message={loginError} /> : null}
          <View style={styles.actionWrap}>
            <WizardAction
              label="Đăng nhập"
              onPress={() => { void handleLogin(); }}
              loading={loggingIn}
            />
          </View>
        </Card>
      ) : loading ? (
        <LoadingState label="Đang tải lịch hẹn..." />
      ) : loadError ? (
        <Card>
          <CardTitle>Không thể tải lịch hẹn</CardTitle>
          <CardText>{loadError}</CardText>
          <Pressable accessibilityRole="button" onPress={() => setRevision((v) => v + 1)}>
            <Text style={[styles.actionText, { color: theme.brand }]}>Thử lại</Text>
          </Pressable>
        </Card>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Chưa có lịch hẹn"
          description="Các lịch hẹn bạn đã đặt sẽ xuất hiện tại đây."
          action={
            <PrimaryButton
              label="Đặt lịch ngay"
              onPress={() => router.push("/(customer)/book")}
              style={{ minWidth: 160 }}
            />
          }
        />
      ) : (
        appointments.map((item) => (
          <Card key={item.id}>
            <View style={styles.heading}>
              <CardTitle>{formattedTime(item.startTime)}</CardTitle>
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
                  {statusLabels[item.status] || item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <CardText>Mã lịch: {item.id}</CardText>
            {item.stylistId ? <CardText>Stylist ID: {item.stylistId}</CardText> : null}

            {/* Cancel flow for booked appointments */}
            {item.status === "booked" && confirmingCancelId !== item.id ? (
              <Pressable
                accessibilityRole="button"
                disabled={processingId !== null}
                onPress={() => {
                  setActionError(null);
                  setConfirmingCancelId(item.id);
                }}
              >
                <Text style={[styles.actionText, { color: theme.danger }]}>Hủy lịch hẹn</Text>
              </Pressable>
            ) : null}

            {item.status === "booked" && confirmingCancelId === item.id ? (
              <View style={styles.confirmation}>
                <Text style={{ color: theme.text }}>Bạn có chắc muốn hủy lịch hẹn này?</Text>
                {actionError ? (
                  <Text accessibilityLiveRegion="polite" style={{ color: theme.danger }}>
                    {actionError}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={processingId !== null}
                    onPress={() => {
                      setConfirmingCancelId(null);
                      setActionError(null);
                    }}
                  >
                    <Text style={[styles.actionText, { color: theme.textMuted }]}>Giữ lịch</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={processingId !== null}
                    onPress={() => { void handleCancel(item.id); }}
                  >
                    {processingId === item.id ? (
                      <ActivityIndicator color={theme.danger} />
                    ) : (
                      <Text style={[styles.actionText, { color: theme.danger }]}>Xác nhận hủy</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Payment button for completed appointments */}
            {item.status === "completed" ? (
              <View style={styles.actionWrap}>
                <WizardAction
                  label="Thanh toán dịch vụ (MoMo / VNPay)"
                  onPress={() => { void handlePay(item.id); }}
                  loading={processingId === item.id}
                />
              </View>
            ) : null}

            {item.status === "paid" ? (
              <Text style={[styles.paidNote, { color: theme.brand }]}>
                Đã thanh toán dịch vụ thành công.
              </Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: 8,
  },
  actionWrap: {
    marginTop: 10,
  },
  paidNote: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  confirmation: {
    gap: 8,
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
});
