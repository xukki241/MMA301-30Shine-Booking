import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, CardText, CardTitle, Screen } from "@/components/screen";
import { useAppTheme } from "@/constants/theme";
import { useConnectivity } from "@/offline/network-provider";
import { managerToday } from "@/manager/date";
import { ManagerDatePicker, ManagerSelect, ManagerTimePicker } from "@/manager/filters-ui";
import { ManagerAction } from "@/manager/ui";
import { canSubmitMutation, createLatestRequestGate, localTime, validateServiceDraft, validateShiftDraft } from "@/manager/operations-model";
import type { Branch, Service, Shift, Stylist, StylistCandidate } from "@/manager/types";
import { useManagerApi } from "@/manager/use-manager-api";

type Kind = "branch" | "service" | "stylist" | "shift";
type Item = Branch | Service | Stylist | Shift;
const labels: Record<Kind, string> = { branch: "Chi nhánh", service: "Dịch vụ", stylist: "Hồ sơ thợ", shift: "Phân ca" };

export default function ManagerOperations() {
  const api = useManagerApi();
  const theme = useAppTheme();
  const connectivity = useConnectivity();
  const [kind, setKind] = useState<Kind>("branch");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [candidates, setCandidates] = useState<StylistCandidate[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [branchId, setBranchId] = useState("");
  const [shiftStylistId, setShiftStylistId] = useState("");
  const [date, setDate] = useState(managerToday);
  const [editing, setEditing] = useState<{ id?: string; draft: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const requestGate = useRef(createLatestRequestGate());

  const load = useCallback(async () => {
    const request = requestGate.current.begin();
    setLoading(true); setError(""); setServices([]); setStylists([]); setShifts([]); setCandidates([]);
    try {
      const next = await api.branches();
      if (!requestGate.current.isCurrent(request)) return;
      setBranches(next);
      const selected = next.some((branch) => branch.id === branchId) ? branchId : next[0]?.id || "";
      if (selected !== branchId) { setBranchId(selected); setShiftStylistId(""); return; }
      if (selected) {
        const [nextServices, nextStylists, nextShifts, nextCandidates] = await Promise.all([
          api.services(selected), api.stylists(selected), api.shifts(selected, date, shiftStylistId || undefined),
          kind === "stylist" ? api.stylistCandidates(selected) : Promise.resolve([]),
        ]);
        if (!requestGate.current.isCurrent(request)) return;
        setServices(nextServices); setStylists(nextStylists); setShifts(nextShifts); setCandidates(nextCandidates);
      } else { setServices([]); setStylists([]); setShifts([]); }
    } catch (cause) { if (requestGate.current.isCurrent(request)) setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu."); }
    finally { if (requestGate.current.isCurrent(request)) setLoading(false); }
  }, [api, branchId, date, shiftStylistId, kind]);
  useEffect(() => {
    void load();
    return () => requestGate.current.invalidate();
  }, [load, revision]);

  function open(item?: Item) {
    const value = item as unknown as Record<string, string | number | boolean> | undefined;
    const draft: Record<string, string> = {};
    const fields = kind === "branch" ? ["name", "address", "phone"] : kind === "service" ?
      ["name", "price", "durationMinutes", "description"] : kind === "stylist" ?
      ["userId"] : ["date", "stylistId", "start", "end"];
    for (const field of fields) draft[field] = String(value?.[field] ?? "");
    if (kind === "service") draft.durationMinutes ||= "45";
    if (kind === "shift") {
      const shift = item as Shift | undefined;
      draft.date ||= date;
      draft.stylistId ||= stylists[0]?.userId || "";
      draft.start = shift ? localTime(shift.startAt) : "09:00";
      draft.end = shift ? localTime(shift.endAt) : "17:00";
    } else {
      draft.isActive = String(value?.isActive ?? true);
      if (kind === "stylist") draft.branchId = String(value?.branchId ?? branchId);
    }
    setEditing({ id: item?.id, draft }); setError(""); setNotice("");
  }

  async function save() {
    if (!editing || busy) return;
    if (!canSubmitMutation(connectivity)) { setError("Bạn đang ngoại tuyến. Kết nối mạng rồi thử lại."); return; }
    const d = editing.draft;
    let payload: Record<string, unknown>;
    if (kind === "branch") {
      if (d.name.trim().length < 2 || d.address.trim().length < 5) { setError("Tên hoặc địa chỉ chi nhánh không hợp lệ."); return; }
      payload = { name: d.name.trim(), address: d.address.trim(), phone: d.phone.trim(), isActive: d.isActive === "true" };
    } else if (kind === "service") {
      const problem = validateServiceDraft({ name: d.name, price: Number(d.price), durationMinutes: Number(d.durationMinutes) });
      if (problem) { setError(problem); return; }
      payload = { name: d.name.trim(), price: Number(d.price), durationMinutes: Number(d.durationMinutes),
        description: d.description.trim(), isActive: d.isActive === "true" };
    } else if (kind === "stylist") {
      if (!editing.id && !candidates.some((item) => item.id === d.userId)) {
        setError("Hãy chọn tài khoản Stylist trong danh sách."); return;
      }
      payload = { ...(!editing.id ? { userId: d.userId } : { branchId: d.branchId }), isActive: d.isActive === "true" };
    } else {
      payload = { branchId, stylistId: d.stylistId, date: d.date,
        startAt: `${d.date}T${d.start}:00+07:00`, endAt: `${d.date}T${d.end}:00+07:00` };
      const problem = validateShiftDraft(payload as { branchId: string; stylistId: string; date: string; startAt: string; endAt: string });
      if (problem) { setError(problem); return; }
    }
    setBusy(true); setError("");
    try {
      if (kind === "branch") editing.id ? await api.updateBranch(editing.id, payload) : await api.createBranch(payload);
      if (kind === "service") editing.id ? await api.updateService(editing.id, payload) : await api.createService(branchId, payload);
      if (kind === "stylist") editing.id ? await api.updateStylist(editing.id, payload) : await api.createStylist(branchId, payload);
      if (kind === "shift") editing.id ? await api.updateShift(editing.id, payload) : await api.createShift(payload);
      setEditing(null); setNotice("Đã lưu thay đổi."); setRevision((value) => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được."); }
    finally { setBusy(false); }
  }

  function remove(item: Item) {
    if (!canSubmitMutation(connectivity)) { setError("Bạn đang ngoại tuyến. Kết nối mạng rồi thử lại."); return; }
    Alert.alert("Xác nhận xóa", `Xóa ${labels[kind].toLowerCase()} này?`, [
      { text: "Không", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => { void (async () => {
        setBusy(true); setError("");
        try {
          if (kind === "branch") await api.deleteBranch(item.id);
          if (kind === "service") await api.deleteService(item.id);
          if (kind === "stylist") await api.deleteStylist(item.id);
          if (kind === "shift") await api.deleteShift(item.id);
          setNotice("Đã xóa."); setRevision((value) => value + 1);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Không xóa được."); }
        finally { setBusy(false); }
      })(); } },
    ]);
  }

  const items: Item[] = kind === "branch" ? branches : kind === "service" ? services : kind === "stylist" ? stylists : shifts;
  const fields = kind === "branch" ? [["name", "Tên chi nhánh"], ["address", "Địa chỉ"], ["phone", "Số điện thoại"]] :
    kind === "service" ? [["name", "Tên dịch vụ"], ["price", "Giá (VND)"], ["durationMinutes", "Thời lượng (phút)"], ["description", "Mô tả"]] :
    kind === "stylist" ? [] :
    [];
  return <Screen eyebrow="General Manager" title="Vận hành" description="Chi nhánh, dịch vụ, hồ sơ thợ và phân ca.">
    <View style={styles.tabs}>{(Object.keys(labels) as Kind[]).map((value) => <Action key={value}
      label={labels[value]} onPress={() => { setKind(value); setEditing(null); setError(""); }} selected={kind === value} />)}</View>
    {kind !== "branch" && <ManagerSelect label="Chi nhánh" value={branchId}
      onChange={(value) => { setBranchId(value); setShiftStylistId(""); setEditing(null); }}
      options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} />}
    {kind === "shift" && <><ManagerDatePicker label="Ngày phân ca" value={date} onChange={setDate} />
      <ManagerSelect label="Thợ" value={shiftStylistId} onChange={setShiftStylistId}
        options={[{ value: "", label: "Tất cả thợ" }, ...stylists.map((stylist) => ({ value: stylist.userId, label: stylist.displayName }))]} /></>}
    <View style={styles.toolbar}><Action label={`Thêm ${labels[kind].toLowerCase()}`} icon="add"
      variant="primary" onPress={() => open()} disabled={busy || (kind !== "branch" && !branchId)} />
      <Action label="Làm mới" icon="refresh-outline" variant="quiet" onPress={() => { void load(); }} disabled={loading} /></View>
    {loading && <Text style={{ color: theme.textMuted }}>Đang tải...</Text>}
    {!!error && <Text style={{ color: theme.danger }}>{error}</Text>}
    {!!notice && <Text style={{ color: theme.text }}>{notice}</Text>}
    {editing && <Card highlighted><CardTitle>{editing.id ? "Sửa" : "Thêm"} {labels[kind].toLowerCase()}</CardTitle>
      {kind === "stylist" && !editing.id && <>
        <ManagerSelect label="Tài khoản Stylist" value={editing.draft.userId || ""}
          onChange={(value) => setEditing({ ...editing, draft: { ...editing.draft, userId: value } })}
          searchable
          placeholder="Chọn thợ theo tên hoặc email"
          options={candidates.map((candidate) => ({ value: candidate.id, label: `${candidate.fullName} · ${candidate.email}` }))} />
        {candidates.length === 0 && <CardText>Chưa có tài khoản Stylist phù hợp. Nhờ System Admin tạo tài khoản hoặc bổ sung họ tên.</CardText>}
      </>}
      {kind === "stylist" && editing.id && <>
        <CardText>Họ tên do System Admin quản lý. Bạn có thể chuyển thợ sang chi nhánh khác hoặc đổi trạng thái.</CardText>
        <ManagerSelect label="Chi nhánh làm việc" value={editing.draft.branchId || branchId}
          onChange={(value) => setEditing({ ...editing, draft: { ...editing.draft, branchId: value } })}
          options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} />
      </>}
      {kind === "shift" && <ManagerDatePicker label="Ngày phân ca" value={editing.draft.date}
        onChange={(value) => setEditing({ ...editing, draft: { ...editing.draft, date: value } })} />}
      {kind === "shift" && <><CardText>Chọn thợ:</CardText><View style={styles.row}>{stylists.map((stylist) =>
        <Action key={stylist.id} label={stylist.displayName} selected={editing.draft.stylistId === stylist.userId}
          onPress={() => setEditing({ ...editing, draft: { ...editing.draft, stylistId: stylist.userId } })} />)}</View></>}
      {kind === "shift" && <>
        <ManagerTimePicker label="Bắt đầu" value={editing.draft.start || "09:00"}
          onChange={(value) => setEditing({ ...editing, draft: { ...editing.draft, start: value } })} />
        <ManagerTimePicker label="Kết thúc" value={editing.draft.end || "17:00"}
          onChange={(value) => setEditing({ ...editing, draft: { ...editing.draft, end: value } })} />
      </>}
      {fields.map(([field, label]) =>
        <Field key={field} label={label} value={editing.draft[field] || ""}
          onChange={(value) => setEditing({ ...editing, draft: { ...editing.draft, [field]: value } })} />)}
      {kind !== "shift" && <Action label={editing.draft.isActive === "true" ? "Đang hoạt động · bấm để tắt" : "Tạm ngưng · bấm để bật"}
        onPress={() => setEditing({ ...editing, draft: { ...editing.draft, isActive: editing.draft.isActive === "true" ? "false" : "true" } })} />}
      <View style={styles.row}><Action label={busy ? "Đang lưu..." : "Lưu thay đổi"} icon="checkmark"
        variant="primary" onPress={() => { void save(); }} disabled={busy} />
        <Action label="Hủy" variant="quiet" onPress={() => setEditing(null)} disabled={busy} /></View></Card>}
    {!loading && items.length === 0 && <Card><CardText>Chưa có dữ liệu trong bộ lọc này.</CardText></Card>}
    {items.map((item) => <Card key={item.id}><CardTitle>{kind === "branch" ? (item as Branch).name :
      kind === "service" ? (item as Service).name : kind === "stylist" ? (item as Stylist).displayName :
      `${(item as Shift).date} · ${localTime((item as Shift).startAt)}–${localTime((item as Shift).endAt)}`}</CardTitle>
      <CardText>{kind === "branch" ? (item as Branch).address : kind === "service" ?
        `${new Intl.NumberFormat("vi-VN").format((item as Service).price)} ₫ · ${(item as Service).durationMinutes} phút` :
        kind === "stylist" ? ((item as Stylist).isActive ? "Đang hoạt động tại chi nhánh" : "Tạm ngưng tại chi nhánh") :
        `Thợ: ${stylists.find((stylist) => stylist.userId === (item as Shift).stylistId)?.displayName || (item as Shift).stylistId}`}</CardText>
      <View style={styles.row}><Action label="Sửa" icon="create-outline" onPress={() => open(item)} disabled={busy} />
        <Action label="Xóa" icon="trash-outline" danger onPress={() => remove(item)} disabled={busy} /></View></Card>)}
  </Screen>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const theme = useAppTheme();
  return <View style={styles.field}><Text style={{ color: theme.text, fontWeight: "700" }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
      style={[styles.input, { borderColor: theme.border, color: theme.text }]} /></View>;
}
function Action({ label, onPress, disabled = false, selected = false, variant, icon, danger }: {
  label: string; onPress: () => void; disabled?: boolean; selected?: boolean;
  variant?: "outline" | "primary" | "quiet"; icon?: React.ComponentProps<typeof ManagerAction>["icon"]; danger?: boolean;
}) {
  return <ManagerAction label={label} onPress={onPress} disabled={disabled} selected={selected}
    variant={variant} icon={icon} danger={danger} />;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16 },
  toolbar: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginHorizontal: 16 },
  field: { gap: 5, marginTop: 8 }, input: { borderWidth: 1, borderRadius: 10, minHeight: 44, paddingHorizontal: 12 } });
