import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Text } from "react-native";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { useAppTheme } from "@/constants/theme";
import { managerToday } from "@/manager/date";
import { displayTime, ManagerAction, ManagerField, ManagerRow, money } from "@/manager/ui";
import type { AppointmentStatus, Branch, ManagerAppointment, Stylist } from "@/manager/types";
import { useManagerApi } from "@/manager/use-manager-api";

const statuses: Array<[AppointmentStatus | "", string]> = [["", "Tất cả"], ["booked", "Đã đặt"],
  ["completed", "Hoàn thành"], ["paid", "Đã trả"], ["cancelled", "Đã hủy"]];
export default function ManagerAppointments() {
  const api = useManagerApi();
  const theme = useAppTheme();
  const [date, setDate] = useState(managerToday);
  const [branchId, setBranchId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [items, setItems] = useState<ManagerAppointment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    const current = ++requestId.current;
    setLoading(true); setError(""); setItems([]); setCursor(null);
    void (async () => {
      const nextBranches = await api.branches();
      const selected = branchId ? nextBranches.filter((branch) => branch.id === branchId) : nextBranches;
      const [stylistGroups, page] = await Promise.all([
        Promise.all(selected.map((branch) => api.stylists(branch.id))),
        api.appointments({ date, branchId: branchId || undefined, stylistId: stylistId || undefined,
          status: status || undefined, limit: 20 }),
      ]);
      if (active && requestId.current === current) {
        setBranches(nextBranches); setStylists(stylistGroups.flat()); setItems(page.items); setCursor(page.nextCursor);
      }
    })().catch((cause) => { if (active && requestId.current === current) setError(cause instanceof Error ? cause.message : "Không tải được lịch."); })
      .finally(() => { if (active && requestId.current === current) setLoading(false); });
    return () => { active = false; };
  }, [api, date, branchId, stylistId, status, revision]));

  async function loadMore() {
    if (!cursor || loadingMore) return;
    const current = requestId.current;
    setLoadingMore(true); setError("");
    try {
      const page = await api.appointments({ date, branchId: branchId || undefined,
        stylistId: stylistId || undefined, status: status || undefined, limit: 20, cursor });
      if (current === requestId.current) {
        setItems((before) => [...before, ...page.items.filter((item) => !before.some((old) => old.id === item.id))]);
        setCursor(page.nextCursor);
      }
    } catch (cause) { if (current === requestId.current) setError(cause instanceof Error ? cause.message : "Không tải được trang tiếp."); }
    finally { setLoadingMore(false); }
  }
  return <Screen eyebrow="General Manager" title="Lịch đặt" description="Chỉ xem và lọc; Stylist và Customer đổi trạng thái theo quyền của họ.">
    <ManagerField label="Ngày YYYY-MM-DD" value={date} onChange={setDate} />
    <Card><CardTitle>Chi nhánh</CardTitle><ManagerRow>
      <ManagerAction label="Tất cả" selected={!branchId} onPress={() => { setBranchId(""); setStylistId(""); }} />
      {branches.map((branch) => <ManagerAction key={branch.id} label={branch.name} selected={branchId === branch.id}
        onPress={() => { setBranchId(branch.id); setStylistId(""); }} />)}</ManagerRow></Card>
    <Card><CardTitle>Thợ</CardTitle><ManagerRow><ManagerAction label="Tất cả" selected={!stylistId} onPress={() => setStylistId("")} />
      {stylists.map((stylist) => <ManagerAction key={stylist.id} label={stylist.displayName}
        selected={stylistId === stylist.userId} onPress={() => setStylistId(stylist.userId)} />)}</ManagerRow></Card>
    <ManagerRow>{statuses.map(([value, label]) => <ManagerAction key={value} label={label} selected={status === value}
      onPress={() => setStatus(value)} />)}</ManagerRow>
    <ManagerAction label="Tải lại" onPress={() => setRevision((value) => value + 1)} disabled={loading} />
    {loading && <Text style={{ color: theme.textMuted }}>Đang tải...</Text>}
    {!!error && <Text style={{ color: theme.danger }}>{error}</Text>}
    {!loading && !error && items.length === 0 && <Card><CardText>Không có lịch trong bộ lọc này.</CardText></Card>}
    {items.map((item) => <Card key={item.id}><CardTitle>{item.customerName || "Khách hàng"} · {displayTime(item.startTime)}</CardTitle>
      <CardText>{statuses.find(([value]) => value === item.status)?.[1]} · {branches.find((branch) => branch.id === item.branchId)?.name || item.branchId}</CardText>
      <CardText>{stylists.find((stylist) => stylist.userId === item.stylistId)?.displayName || "Thợ"} · {item.bookedPrice === undefined ? "Chưa có giá chốt" : money(item.bookedPrice)}</CardText>
      <ManagerAction label="Xem chi tiết" onPress={() => router.push({ pathname: "/(manager)/appointment-detail", params: { id: item.id } } as unknown as Href)} /></Card>)}
    {!!cursor && <ManagerAction label={loadingMore ? "Đang tải..." : "Xem thêm"} onPress={() => { void loadMore(); }} disabled={loadingMore} />}
  </Screen>;
}
