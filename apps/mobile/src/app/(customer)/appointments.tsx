import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { demoAppointmentDataSource } from "@/appointments/demo-adapter";
import type { AppointmentStatus, CustomerAppointment } from "@/appointments/types";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { useAppTheme } from "@/constants/theme";

const statusLabels: Record<AppointmentStatus, string> = {
  booked: "Đã đặt",
  completed: "Đã hoàn thành",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy"
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Chưa có thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có thời gian";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

export default function CustomerAppointmentsScreen() {
  const theme = useAppTheme();
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const cancelLock = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setConfirmingId(null);
    setActionError(null);
    setLoading(true);
    setLoadError(null);
    void demoAppointmentDataSource.list()
      .then((items) => { if (active) setAppointments(items); })
      .catch(() => { if (active) setLoadError("Không thể tải lịch hẹn. Vui lòng thử lại."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]));

  async function cancelAppointment(id: string) {
    if (cancelLock.current || confirmingId !== id) return;
    cancelLock.current = true;
    setCancellingId(id);
    setActionError(null);
    try {
      const updated = await demoAppointmentDataSource.cancel(id);
      setAppointments((current) => current.map((item) => item.id === id ? updated : item));
      setConfirmingId(null);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể hủy lịch hẹn. Vui lòng thử lại.");
    } finally {
      cancelLock.current = false;
      setCancellingId(null);
    }
  }

  return (
    <Screen
      eyebrow="Customer · Demo"
      title="Lịch hẹn của tôi"
      description="Theo dõi lịch hẹn và hủy lịch đang ở trạng thái đã đặt."
    >
      <View style={[styles.notice, { backgroundColor: theme.surfaceMuted }]}>
        <Text style={{ color: theme.textMuted }}>
          Đây là lịch mẫu trên thiết bị. Thao tác hủy chưa gửi lên server và sẽ mất khi khởi động lại ứng dụng.
        </Text>
      </View>

      {loading ? <LoadingState label="Đang tải lịch hẹn..." /> : loadError ? (
        <Card>
          <CardTitle>Không thể tải lịch hẹn</CardTitle>
          <CardText>{loadError}</CardText>
          <Pressable accessibilityRole="button" onPress={() => setReloadKey((current) => current + 1)}>
            <Text style={[styles.actionText, { color: theme.brand }]}>Thử lại</Text>
          </Pressable>
        </Card>
      ) : appointments.length === 0 ? (
        <EmptyState icon="📭" title="Chưa có lịch hẹn" description="Lịch hẹn của bạn sẽ xuất hiện tại đây." />
      ) : appointments.map((appointment) => (
        <Card key={appointment.id}>
          <View style={styles.heading}>
            <CardTitle>{appointment.serviceName || "Dịch vụ chưa xác định"}</CardTitle>
            <Text style={[styles.status, { color: appointment.status === "cancelled" ? theme.textMuted : theme.brand }]}>
              {statusLabels[appointment.status] ?? "Chưa rõ trạng thái"}
            </Text>
          </View>
          <CardText>{formatDateTime(appointment.startTime)}</CardText>
          <CardText>Chi nhánh: {appointment.branchName || "Chưa xác định"}</CardText>
          <CardText>Stylist: {appointment.stylistName || "Chưa xác định"}</CardText>
          <CardText>Mã lịch: {appointment.id}</CardText>

          {appointment.status === "booked" && confirmingId !== appointment.id ? (
            <Pressable
              accessibilityRole="button"
              disabled={cancellingId !== null}
              onPress={() => { setActionError(null); setConfirmingId(appointment.id); }}
            >
              <Text style={[styles.actionText, { color: theme.danger }]}>Hủy lịch hẹn</Text>
            </Pressable>
          ) : null}

          {appointment.status === "booked" && confirmingId === appointment.id ? (
            <View style={styles.confirmation}>
              <Text style={{ color: theme.text }}>Bạn có chắc muốn hủy lịch hẹn này?</Text>
              {actionError ? <Text accessibilityLiveRegion="polite" style={{ color: theme.danger }}>{actionError}</Text> : null}
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" disabled={cancellingId !== null} onPress={() => { setConfirmingId(null); setActionError(null); }}>
                  <Text style={[styles.actionText, { color: theme.textMuted }]}>Giữ lịch</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={cancellingId !== null} onPress={() => { void cancelAppointment(appointment.id); }}>
                  {cancellingId === appointment.id ? <ActivityIndicator color={theme.danger} /> :
                    <Text style={[styles.actionText, { color: theme.danger }]}>Xác nhận hủy</Text>}
                </Pressable>
              </View>
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { borderRadius: 12, padding: 12 },
  heading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  status: { fontSize: 14, fontWeight: "700" },
  actionText: { fontSize: 15, fontWeight: "700", paddingVertical: 10 },
  confirmation: { gap: 8, marginTop: 6 },
  actions: { flexDirection: "row", justifyContent: "space-between", gap: 20 }
});
