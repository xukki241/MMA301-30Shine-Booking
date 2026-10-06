import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { useAppTheme } from "@/constants/theme";
import { type AppointmentSummary, isAppointmentSummary } from "@/offline/appointments";
import { useConnectivity } from "@/offline/network-provider";
import { type ReadResult, readCachedList } from "@/offline/read-cache";

const cacheKey = "shine:demo:customer-appointments:v1";
const statusLabels: Record<AppointmentSummary["status"], string> = {
  booked: "Đã đặt",
  completed: "Đã hoàn thành",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy"
};

// develop has no customer appointment listing endpoint yet.
async function listAppointmentsOnDevelop(): Promise<AppointmentSummary[]> {
  return [];
}

function formattedTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(value));
}

export default function CustomerAppointmentsScreen() {
  const theme = useAppTheme();
  const connectivity = useConnectivity();
  const [result, setResult] = useState<ReadResult<AppointmentSummary> | null>(null);
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setResult(null);
    void readCachedList(connectivity, cacheKey, AsyncStorage, isAppointmentSummary, listAppointmentsOnDevelop)
      .then((next) => { if (active) setResult(next); });
    return () => { active = false; };
  }, [connectivity, revision]));

  const offlineMessage = connectivity === "unknown"
    ? "Chưa xác định kết nối. Không có dữ liệu đã lưu để hiển thị."
    : "Không có dữ liệu đã lưu để hiển thị khi ngoại tuyến.";

  return (
    <Screen
      eyebrow="Customer · Demo"
      title="Lịch hẹn của tôi"
      description="Theo dõi lịch hẹn và hủy lịch đang ở trạng thái đã đặt."
    >
      {!result ? (
        <LoadingState label="Đang tải lịch hẹn..." />
      ) : result.kind === "error" ? (
        <>
          <EmptyState icon="⚠️" title="Không tải được lịch hẹn" description="Vui lòng kiểm tra kết nối và thử lại." />
          <Pressable accessibilityRole="button" onPress={() => setRevision((value) => value + 1)}>
            <Text style={{ color: theme.brand, fontWeight: "700" }}>Thử lại</Text>
          </Pressable>
        </>
      ) : result.kind === "offline-empty" || result.items.length === 0 ? (
        <EmptyState
          icon="📭"
          title={result.kind === "offline-empty" || result.kind === "cached" ? "Chưa có lịch hẹn đã lưu" : "Chưa có lịch hẹn"}
          description={result.kind === "offline-empty" || result.kind === "cached"
            ? offlineMessage
            : "Danh sách sẽ hiển thị sau khi API đặt lịch được kết nối."}
        />
      ) : (
        result.items.map((item) => (
          <Card key={item.id}>
            <CardTitle>{formattedTime(item.startTime)}</CardTitle>
            <CardText>Trạng thái: {statusLabels[item.status]}</CardText>
            <CardText>Mã lịch: {item.id}</CardText>
          </Card>
        ))
      )}
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
