import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Text } from "react-native";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { useAppTheme } from "@/constants/theme";
import { displayTime, ManagerAction, money } from "@/manager/ui";
import type { ManagerAppointment } from "@/manager/types";
import { useManagerApi } from "@/manager/use-manager-api";

export default function ManagerAppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useManagerApi();
  const theme = useAppTheme();
  const [item, setItem] = useState<ManagerAppointment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!id) return () => { active = false; };
    setLoading(true); setError("");
    void api.appointment(id).then((next) => { if (active) setItem(next); })
      .catch((cause) => { if (active) { setItem(null); setError(cause instanceof Error ? cause.message : "Không tải được lịch."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, id, revision]));
  return <Screen eyebrow="General Manager" title="Chi tiết lịch" description="Thông tin liên hệ chỉ hiển thị trong màn chi tiết đã đăng nhập.">
    <ManagerAction label="Tải lại" onPress={() => setRevision((value) => value + 1)} disabled={loading} />
    {loading && <Text style={{ color: theme.textMuted }}>Đang tải...</Text>}
    {!!error && <Text style={{ color: theme.danger }}>{error}</Text>}
    {item && <Card><CardTitle>{item.customerName || "Khách hàng"}</CardTitle>
      <CardText>Số điện thoại: {item.customerPhone || "Không có"}</CardText>
      <CardText>Bắt đầu: {displayTime(item.startTime)}</CardText>
      <CardText>Kết thúc: {displayTime(item.endTime)}</CardText>
      <CardText>Trạng thái: {item.status}</CardText>
      <CardText>Chi nhánh: {item.branchId || "Không có"}</CardText>
      <CardText>Dịch vụ: {item.serviceId || "Không có"}</CardText>
      <CardText>Thợ: {item.stylistId}</CardText>
      <CardText>Giá chốt: {item.bookedPrice === undefined ? "Lịch cũ chưa có giá chốt" : money(item.bookedPrice)}</CardText>
    </Card>}
  </Screen>;
}
