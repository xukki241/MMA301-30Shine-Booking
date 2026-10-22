import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { useAppTheme } from "@/constants/theme";
import { managerToday } from "@/manager/date";
import { displayTime, ManagerAction, money } from "@/manager/ui";
import { ManagerDatePicker, ManagerSelect } from "@/manager/filters-ui";
import type { Branch, ManagerPayment } from "@/manager/types";
import { useManagerApi } from "@/manager/use-manager-api";

export default function ManagerPayments() {
  const api = useManagerApi();
  const theme = useAppTheme();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState(managerToday);
  const [to, setTo] = useState(managerToday);
  const [allTime, setAllTime] = useState(false);
  const [items, setItems] = useState<ManagerPayment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const validRange = allTime || from <= to;
  useEffect(() => { const interval = setInterval(() => setRevision((value) => value + 1), 30000);
    return () => clearInterval(interval); }, []);
  const requestId = useRef(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    const current = ++requestId.current;
    setLoading(true); setError(""); setItems([]); setCursor(null); setTotal(0);
    void (async () => {
      const nextBranches = await api.branches();
      if (active && requestId.current === current) setBranches(nextBranches);
      if (!branchId || !validRange) return;
      const page = await api.payments({ branchId, from: allTime ? undefined : from, to: allTime ? undefined : to, limit: 20 });
      if (active && requestId.current === current) {
        setItems(page.items); setCursor(page.nextCursor); setTotal(page.simulatedTotal);
      }
    })().catch((cause) => { if (active && requestId.current === current) setError(cause instanceof Error ? cause.message : "Không tải được thanh toán."); })
      .finally(() => { if (active && requestId.current === current) setLoading(false); });
    return () => { active = false; };
  }, [api, branchId, from, to, allTime, validRange, revision]));

  async function loadMore() {
    if (!branchId || !cursor || loadingMore) return;
    const current = requestId.current;
    setLoadingMore(true); setError("");
    try {
      const page = await api.payments({ branchId, from: allTime ? undefined : from, to: allTime ? undefined : to, limit: 20, cursor });
      if (current === requestId.current) {
        setItems((before) => [...before, ...page.items.filter((item) => !before.some((old) => old.id === item.id))]);
        setCursor(page.nextCursor); setTotal(page.simulatedTotal);
      }
    } catch (cause) { if (current === requestId.current) setError(cause instanceof Error ? cause.message : "Không tải được trang tiếp."); }
    finally { setLoadingMore(false); }
  }
  return <Screen eyebrow="General Manager" title="Lịch sử thanh toán" description="Theo dõi giao dịch mô phỏng theo chi nhánh và thời gian.">
    <ManagerSelect label="Chi nhánh" value={branchId} onChange={setBranchId} placeholder="Chọn chi nhánh"
      options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} />
    <View style={styles.dateModes}><ManagerAction label="Khoảng ngày" selected={!allTime} onPress={() => setAllTime(false)} />
      <ManagerAction label="Tất cả thời gian" selected={allTime} onPress={() => setAllTime(true)} /></View>
    {!allTime && <><ManagerDatePicker label="Từ ngày" value={from} onChange={setFrom} />
      <ManagerDatePicker label="Đến ngày" value={to} onChange={setTo} /></>}
    {!validRange && <Text style={[styles.rangeError, { color: theme.danger }]}>Ngày kết thúc phải từ ngày bắt đầu trở đi.</Text>}
    <View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: theme.text }]}>Giao dịch</Text>
      <ManagerAction label="Làm mới" icon="refresh-outline" variant="quiet"
        onPress={() => setRevision((value) => value + 1)} disabled={loading || !validRange} /></View>
    {!branchId && <Card><CardText>Chọn một chi nhánh để xem giao dịch.</CardText></Card>}
    {loading && <Text style={{ color: theme.textMuted }}>Đang tải...</Text>}
    {!!error && <Text style={{ color: theme.danger }}>{error}</Text>}
    {!!branchId && validRange && !loading && <Card highlighted><CardTitle>{money(total)}</CardTitle>
      <CardText>Tổng giao dịch thành công trong khoảng ngày đã chọn.</CardText></Card>}
    {!!branchId && validRange && !loading && !error && items.length === 0 && <Card><CardText>Chưa có giao dịch trong khoảng ngày này.</CardText></Card>}
    {items.map((item) => <Card key={item.id}><CardTitle>{item.status === "success" ? "Thành công" : "Thất bại"} · {money(item.amount)}</CardTitle>
      <CardText>{displayTime(item.attemptedAt)} · {item.provider === "momo" ? "MoMo" : "VNPay"}</CardText>
      <CardText>Lịch: {item.appointmentId}{item.customerName ? ` · ${item.customerName}` : ""}</CardText></Card>)}
    {!!cursor && <View style={styles.more}><ManagerAction label={loadingMore ? "Đang tải..." : "Xem thêm giao dịch"}
      onPress={() => { void loadMore(); }} disabled={loadingMore} /></View>}
  </Screen>;
}

const styles = StyleSheet.create({
  dateModes: { marginHorizontal: 16, flexDirection: "row", gap: 8 },
  sectionRow: { marginHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  rangeError: { marginHorizontal: 16, fontSize: 13 },
  more: { marginHorizontal: 16, alignItems: "center" },
});
