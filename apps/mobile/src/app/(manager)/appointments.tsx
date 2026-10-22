import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { useAppTheme } from "@/constants/theme";
import { managerToday } from "@/manager/date";
import { displayTime, ManagerAction, money } from "@/manager/ui";
import { ManagerDatePicker, ManagerSelect } from "@/manager/filters-ui";
import type { AppointmentStatus, Branch, ManagerAppointment, Stylist } from "@/manager/types";
import { useManagerApi } from "@/manager/use-manager-api";

const statuses: Array<[AppointmentStatus | "", string]> = [["", "Tất cả"], ["booked", "Đã đặt"],
  ["checked_in", "Đã đến"], ["completed", "Hoàn thành"], ["paid", "Đã trả"],
  ["cancelled", "Đã hủy"], ["no_show", "Không đến"]];
export default function ManagerAppointments() {
  const api = useManagerApi();
  const theme = useAppTheme();
  const [date, setDate] = useState(managerToday);
  const [allDates, setAllDates] = useState(false);
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
  useEffect(() => { const interval = setInterval(() => setRevision((value) => value + 1), 30000);
    return () => clearInterval(interval); }, []);
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
        api.appointments({ date: allDates ? "all" : date, branchId: branchId || undefined, stylistId: stylistId || undefined,
          status: status || undefined, limit: 20 }),
      ]);
      if (active && requestId.current === current) {
        setBranches(nextBranches); setStylists(stylistGroups.flat()); setItems(page.items); setCursor(page.nextCursor);
      }
    })().catch((cause) => { if (active && requestId.current === current) setError(cause instanceof Error ? cause.message : "Không tải được lịch."); })
      .finally(() => { if (active && requestId.current === current) setLoading(false); });
    return () => { active = false; };
  }, [api, date, allDates, branchId, stylistId, status, revision]));

  async function loadMore() {
    if (!cursor || loadingMore) return;
    const current = requestId.current;
    setLoadingMore(true); setError("");
    try {
      const page = await api.appointments({ date: allDates ? "all" : date, branchId: branchId || undefined,
        stylistId: stylistId || undefined, status: status || undefined, limit: 20, cursor });
      if (current === requestId.current) {
        setItems((before) => [...before, ...page.items.filter((item) => !before.some((old) => old.id === item.id))]);
        setCursor(page.nextCursor);
      }
    } catch (cause) { if (current === requestId.current) setError(cause instanceof Error ? cause.message : "Không tải được trang tiếp."); }
    finally { setLoadingMore(false); }
  }
  return <Screen eyebrow="General Manager" title="Lịch đặt" description="Xem lịch khách theo ngày, chi nhánh và trạng thái.">
    <View style={styles.dateModes}><ManagerAction label="Một ngày" selected={!allDates} onPress={() => setAllDates(false)} />
      <ManagerAction label="Tất cả ngày" selected={allDates} onPress={() => setAllDates(true)} /></View>
    {!allDates && <ManagerDatePicker label="Ngày đặt lịch" value={date} onChange={setDate} />}
    <ManagerSelect label="Chi nhánh" value={branchId} onChange={(value) => { setBranchId(value); setStylistId(""); }}
      options={[{ value: "", label: "Tất cả chi nhánh" }, ...branches.map((branch) => ({ value: branch.id, label: branch.name }))]} />
    <ManagerSelect label="Thợ" value={stylistId} onChange={setStylistId}
      options={[{ value: "", label: "Tất cả thợ" }, ...stylists.map((stylist) => ({ value: stylist.userId, label: stylist.displayName }))]} />
    <ManagerSelect label="Trạng thái" value={status} onChange={(value) => setStatus(value as AppointmentStatus | "")}
      options={statuses.map(([value, label]) => ({ value, label }))} />
    <View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: theme.text }]}>Danh sách lịch hẹn</Text>
      <ManagerAction label="Làm mới" icon="refresh-outline" variant="quiet"
        onPress={() => setRevision((value) => value + 1)} disabled={loading} /></View>
    {loading && <Text style={{ color: theme.textMuted }}>Đang tải...</Text>}
    {!!error && <Text style={{ color: theme.danger }}>{error}</Text>}
    {!loading && !error && items.length === 0 && <Card><CardText>Không có lịch trong bộ lọc này.</CardText></Card>}
    {items.map((item) => <Card key={item.id}>
      <View style={styles.itemHeader}><CardTitle>{item.customerName || "Khách hàng"}</CardTitle>
        <Text style={[styles.statusBadge, { color: theme.brand, backgroundColor: theme.brandMuted }]}>
          {statuses.find(([value]) => value === item.status)?.[1]}</Text></View>
      <CardText>{displayTime(item.startTime)}</CardText>
      <CardText>{branches.find((branch) => branch.id === item.branchId)?.name || "Chi nhánh chưa cập nhật"}</CardText>
      <CardText>{stylists.find((stylist) => stylist.userId === item.stylistId)?.displayName || "Thợ chưa cập nhật"} · {item.bookedPrice === undefined ? "Chưa có giá chốt" : money(item.bookedPrice)}</CardText>
      <ManagerAction label="Xem chi tiết" icon="arrow-forward" variant="primary"
        onPress={() => router.push({ pathname: "/(manager)/appointment-detail", params: { id: item.id } } as unknown as Href)} /></Card>)}
    {!!cursor && <View style={styles.more}><ManagerAction label={loadingMore ? "Đang tải..." : "Xem thêm lịch"}
      onPress={() => { void loadMore(); }} disabled={loadingMore} /></View>}
  </Screen>;
}

const styles = StyleSheet.create({
  dateModes: { marginHorizontal: 16, flexDirection: "row", gap: 8 },
  sectionRow: { marginHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: "800" },
  more: { marginHorizontal: 16, alignItems: "center" },
});
