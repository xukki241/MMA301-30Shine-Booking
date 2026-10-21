import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Text } from "react-native";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { useAppTheme } from "@/constants/theme";
import { managerToday } from "@/manager/date";
import { displayTime, ManagerAction, ManagerField, ManagerRow, money } from "@/manager/ui";
import type { Branch, ManagerPayment } from "@/manager/types";
import { useManagerApi } from "@/manager/use-manager-api";

export default function ManagerPayments() {
  const api = useManagerApi();
  const theme = useAppTheme();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState(managerToday);
  const [to, setTo] = useState(managerToday);
  const [items, setItems] = useState<ManagerPayment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    const current = ++requestId.current;
    setLoading(true); setError(""); setItems([]); setCursor(null); setTotal(0);
    void (async () => {
      const nextBranches = await api.branches();
      if (active && requestId.current === current) setBranches(nextBranches);
      if (!branchId) return;
      const page = await api.payments({ branchId, from: from || undefined, to: to || undefined, limit: 20 });
      if (active && requestId.current === current) {
        setItems(page.items); setCursor(page.nextCursor); setTotal(page.simulatedTotal);
      }
    })().catch((cause) => { if (active && requestId.current === current) setError(cause instanceof Error ? cause.message : "Không tải được thanh toán."); })
      .finally(() => { if (active && requestId.current === current) setLoading(false); });
    return () => { active = false; };
  }, [api, branchId, from, to, revision]));

  async function loadMore() {
    if (!branchId || !cursor || loadingMore) return;
    const current = requestId.current;
    setLoadingMore(true); setError("");
    try {
      const page = await api.payments({ branchId, from: from || undefined, to: to || undefined, limit: 20, cursor });
      if (current === requestId.current) {
        setItems((before) => [...before, ...page.items.filter((item) => !before.some((old) => old.id === item.id))]);
        setCursor(page.nextCursor); setTotal(page.simulatedTotal);
      }
    } catch (cause) { if (current === requestId.current) setError(cause instanceof Error ? cause.message : "Không tải được trang tiếp."); }
    finally { setLoadingMore(false); }
  }
  return <Screen eyebrow="General Manager" title="Lịch sử thanh toán" description="Thanh toán mô phỏng, không trừ tiền thật.">
    <Card><CardTitle>Chọn chi nhánh</CardTitle><ManagerRow>{branches.map((branch) =>
      <ManagerAction key={branch.id} label={branch.name} selected={branchId === branch.id}
        onPress={() => setBranchId(branch.id)} />)}</ManagerRow></Card>
    <ManagerField label="Từ ngày YYYY-MM-DD" value={from} onChange={setFrom} />
    <ManagerField label="Đến ngày YYYY-MM-DD" value={to} onChange={setTo} />
    <ManagerAction label="Tải lại" onPress={() => setRevision((value) => value + 1)} disabled={loading} />
    {!branchId && <Card><CardText>Chọn một chi nhánh để xem giao dịch.</CardText></Card>}
    {loading && <Text style={{ color: theme.textMuted }}>Đang tải...</Text>}
    {!!error && <Text style={{ color: theme.danger }}>{error}</Text>}
    {!!branchId && !loading && <Card><CardTitle>{money(total)}</CardTitle>
      <CardText>Tổng thu mô phỏng từ giao dịch thành công trong toàn bộ bộ lọc.</CardText></Card>}
    {!!branchId && !loading && !error && items.length === 0 && <Card><CardText>Chưa có lần thử thanh toán.</CardText></Card>}
    {items.map((item) => <Card key={item.id}><CardTitle>{item.status === "success" ? "Thành công" : "Thất bại"} · {money(item.amount)}</CardTitle>
      <CardText>{displayTime(item.attemptedAt)} · {item.provider === "momo" ? "MoMo" : "VNPay"}</CardText>
      <CardText>Lịch: {item.appointmentId}{item.customerName ? ` · ${item.customerName}` : ""}</CardText></Card>)}
    {!!cursor && <ManagerAction label={loadingMore ? "Đang tải..." : "Xem thêm"} onPress={() => { void loadMore(); }} disabled={loadingMore} />}
  </Screen>;
}
