import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, Screen } from "@/components/screen";
import { useAppTheme } from "@/constants/theme";
import { managerToday } from "@/manager/date";
import { ManagerAction } from "@/manager/ui";
import { ManagerDatePicker, ManagerSelect } from "@/manager/filters-ui";
import type { Branch, Overview } from "@/manager/types";
import { useManagerApi } from "@/manager/use-manager-api";

const labels = { booked: "Đã đặt", checked_in: "Đã đến", completed: "Đã hoàn thành",
  paid: "Đã thanh toán", cancelled: "Đã hủy", no_show: "Khách không đến" };
export default function ManagerOverview() {
  const api = useManagerApi();
  const theme = useAppTheme();
  const [date, setDate] = useState(managerToday);
  const [allDates, setAllDates] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => { const interval = setInterval(() => setRevision((value) => value + 1), 30000);
    return () => clearInterval(interval); }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(""); setOverview(null);
    void Promise.all([api.branches(), api.overview({ date: allDates ? "all" : date, branchId: branchId || undefined })])
      .then(([nextBranches, nextOverview]) => { if (active) { setBranches(nextBranches); setOverview(nextOverview); } })
      .catch((cause) => { if (active) { setOverview(null); setError(cause instanceof Error ? cause.message : "Không tải được tổng quan."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, date, allDates, branchId, revision]));
  return <Screen eyebrow="General Manager" title="Tổng quan" description="Theo dõi lịch hẹn theo ngày và chi nhánh.">
    <View style={styles.dateModes}><ManagerAction label="Một ngày" selected={!allDates} onPress={() => setAllDates(false)} />
      <ManagerAction label="Tất cả ngày" selected={allDates} onPress={() => setAllDates(true)} /></View>
    {!allDates && <ManagerDatePicker label="Ngày xem báo cáo" value={date} onChange={setDate} />}
    <ManagerSelect label="Chi nhánh" value={branchId} onChange={setBranchId}
      options={[{ value: "", label: "Tất cả chi nhánh" }, ...branches.map((branch) => ({ value: branch.id, label: branch.name }))]} />
    <View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: theme.text }]}>Trạng thái lịch hẹn</Text>
      <ManagerAction label="Làm mới" icon="refresh-outline" variant="quiet"
        onPress={() => setRevision((value) => value + 1)} disabled={loading} /></View>
    {loading && <Text style={{ color: theme.textMuted }}>Đang tải...</Text>}
    {!!error && <Text style={{ color: theme.danger }}>{error}</Text>}
    {overview && <View style={styles.statsGrid}>{(Object.entries(labels) as Array<[keyof Overview["counts"], string]>).map(([status, label]) =>
      <Card key={status} style={styles.statCard}><Text style={[styles.statNumber, { color: theme.text }]}>{overview.counts[status] ?? 0}</Text>
        <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text></Card>)}</View>}
    <View style={styles.sectionRow}><ManagerAction label="Xem lịch đặt" icon="arrow-forward" variant="primary"
      onPress={() => router.push("/(manager)/appointments")} />
      <ManagerAction label="Phân ca" icon="calendar-outline" onPress={() => router.push("/(manager)/operations")} /></View>
  </Screen>;
}

const styles = StyleSheet.create({
  dateModes: { marginHorizontal: 16, flexDirection: "row", gap: 8 },
  sectionRow: { marginHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 10, gap: 10 },
  statCard: { width: "46%", minHeight: 104, marginHorizontal: 0, flexGrow: 1, justifyContent: "center" },
  statNumber: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, lineHeight: 17 },
});
