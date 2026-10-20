import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text } from "react-native";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { useAppTheme } from "@/constants/theme";
import { managerToday } from "@/manager/date";
import { ManagerAction, ManagerField, ManagerRow } from "@/manager/ui";
import type { Branch, Overview } from "@/manager/types";
import { useManagerApi } from "@/manager/use-manager-api";

const labels = { booked: "Đã đặt", completed: "Đã hoàn thành", paid: "Đã thanh toán", cancelled: "Đã hủy" };
export default function ManagerOverview() {
  const api = useManagerApi();
  const theme = useAppTheme();
  const [date, setDate] = useState(managerToday);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError("");
    void Promise.all([api.branches(), api.overview({ date, branchId: branchId || undefined })])
      .then(([nextBranches, nextOverview]) => { if (active) { setBranches(nextBranches); setOverview(nextOverview); } })
      .catch((cause) => { if (active) { setOverview(null); setError(cause instanceof Error ? cause.message : "Không tải được tổng quan."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, date, branchId, revision]));
  return <Screen eyebrow="General Manager" title="Tổng quan" description="Lịch đặt theo ngày tại giờ Việt Nam.">
    <ManagerField label="Ngày YYYY-MM-DD" value={date} onChange={setDate} />
    <ManagerRow><ManagerAction label="Tất cả chi nhánh" selected={!branchId} onPress={() => setBranchId("")} />
      {branches.map((branch) => <ManagerAction key={branch.id} label={branch.name} selected={branch.id === branchId}
        onPress={() => setBranchId(branch.id)} />)}</ManagerRow>
    <ManagerAction label="Tải lại" onPress={() => setRevision((value) => value + 1)} disabled={loading} />
    {loading && <Text style={{ color: theme.textMuted }}>Đang tải...</Text>}
    {!!error && <Text style={{ color: theme.danger }}>{error}</Text>}
    {overview && <>{(Object.entries(labels) as Array<[keyof Overview["counts"], string]>).map(([status, label]) =>
      <Card key={status}><CardTitle>{overview.counts[status] ?? 0}</CardTitle><CardText>{label}</CardText></Card>)}</>}
    <ManagerRow><ManagerAction label="Xem lịch đặt" onPress={() => router.push("/(manager)/appointments")} />
      <ManagerAction label="Xếp ca" onPress={() => router.push("/(manager)/operations")} /></ManagerRow>
  </Screen>;
}
