import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Text } from "react-native";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { useAppTheme } from "@/constants/theme";
import { displayTime, ManagerAction, money } from "@/manager/ui";
import type { Branch, ManagerAppointment, Service, Stylist } from "@/manager/types";
import { useManagerApi } from "@/manager/use-manager-api";

export default function ManagerAppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useManagerApi();
  const theme = useAppTheme();
  const [item, setItem] = useState<ManagerAppointment | null>(null);
  const [names, setNames] = useState({ branch: "", service: "", stylist: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const interval = setInterval(() => setRevision((value) => value + 1), 30000);
    return () => clearInterval(interval); }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!id) return () => { active = false; };
    setLoading(true); setError(""); setItem(null); setNames({ branch: "", service: "", stylist: "" });
    void api.appointment(id).then(async (next) => {
      if (!active) return;
      setItem(next);
      if (!next.branchId) return;
      const catalog = await Promise.allSettled([api.branches(), api.services(next.branchId), api.stylists(next.branchId)]);
      if (!active) return;
      const branches: Branch[] = catalog[0].status === "fulfilled" ? catalog[0].value : [];
      const services: Service[] = catalog[1].status === "fulfilled" ? catalog[1].value : [];
      const stylists: Stylist[] = catalog[2].status === "fulfilled" ? catalog[2].value : [];
      setNames({ branch: branches.find((entry) => entry.id === next.branchId)?.name || "",
        service: services.find((entry) => entry.id === next.serviceId)?.name || "",
        stylist: stylists.find((entry) => entry.userId === next.stylistId)?.displayName || "" });
    })
      .catch((cause) => { if (active) { setItem(null); setError(cause instanceof Error ? cause.message : "Không tải được lịch."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, id, revision]));
  return <Screen eyebrow="General Manager" title="Chi tiết lịch" description="Thông tin liên hệ chỉ hiển thị trong màn chi tiết đã đăng nhập.">
    <ManagerAction label="Làm mới" icon="refresh-outline" variant="quiet"
      onPress={() => setRevision((value) => value + 1)} disabled={loading} />
    {loading && <Text style={{ color: theme.textMuted }}>Đang tải...</Text>}
    {!!error && <Text style={{ color: theme.danger }}>{error}</Text>}
    {item && <Card><CardTitle>{item.customerName || "Khách hàng"}</CardTitle>
      <CardText>Số điện thoại: {item.customerPhone || "Không có"}</CardText>
      <CardText>Bắt đầu: {displayTime(item.startTime)}</CardText>
      <CardText>Kết thúc: {displayTime(item.endTime)}</CardText>
      <CardText>Trạng thái: {({ booked: "Đã đặt", checked_in: "Đã đến · Đang chờ thợ",
        completed: "Đã hoàn thành", paid: "Đã thanh toán", cancelled: "Đã hủy",
        no_show: "Khách không đến" } as const)[item.status]}</CardText>
      <CardText>Chi nhánh: {names.branch || (item.branchId ? `Đã xóa (${item.branchId})` : "Không có")}</CardText>
      <CardText>Dịch vụ: {names.service || (item.serviceId ? `Đã xóa (${item.serviceId})` : "Không có")}</CardText>
      <CardText>Thợ: {names.stylist || `Đã xóa (${item.stylistId})`}</CardText>
      <CardText>Giá chốt: {item.bookedPrice === undefined ? "Lịch cũ chưa có giá chốt" : money(item.bookedPrice)}</CardText>
      {item.status === "no_show" && <ManagerAction label="Khôi phục lịch khách đã đến" icon="arrow-undo-outline" variant="primary"
        onPress={() => Alert.alert("Khôi phục lịch?", "Chỉ dùng khi khách thực sự đã đến và bị đánh dấu nhầm.", [
          { text: "Quay lại", style: "cancel" },
          { text: "Khôi phục", onPress: () => { void api.restoreNoShow(item.id)
            .then(() => setRevision((value) => value + 1))
            .catch((cause) => setError(cause instanceof Error ? cause.message : "Không khôi phục được lịch.")); } },
        ])} />}
    </Card>}
  </Screen>;
}
