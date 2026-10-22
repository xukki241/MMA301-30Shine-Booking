import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDate, upcomingDates } from "@/booking/dates";
import { loadHomeServiceDraft, loadHomeStylistDraft } from "@/booking/home-service-draft";
import { cancelCustomerAppointment, createHttpBookingAdapter, getCustomerAppointments, rescheduleCustomerAppointment } from "@/booking/http-adapter";
import { loadRescheduleDraft } from "@/booking/reschedule-draft";
import { mergeSlotOptions, slotForService, type SlotOption } from "@/booking/slot-options";
import { isCompleteBookingDraft, type AppointmentResult, type BookingDraft, type BookingWishes, type Branch,
  type Service, type Stylist } from "@/booking/types";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

const emptyDraft: BookingDraft = { branch: null, service: null, stylist: null, date: null, slot: null };
const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " VNĐ";
const hour = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

export default function CustomerBookingFlowScreen() {
  const { token, user } = useAuth();
  const { rescheduleId, branchId, serviceId, stylistId } = useLocalSearchParams<{
    rescheduleId?: string; branchId?: string; serviceId?: string; stylistId?: string }>();
  if (!token) return <Redirect href="/login?next=book" />;
  return <BookingFlow token={token} customerName={user?.name || "anh"} customerPhone={user?.phone || ""}
    rescheduleId={rescheduleId || undefined} branchId={branchId} serviceId={serviceId} stylistId={stylistId} />;
}

function BookingFlow({ token, customerName, customerPhone, rescheduleId, branchId, serviceId, stylistId }: { token: string; customerName: string;
  customerPhone: string; rescheduleId?: string; branchId?: string; serviceId?: string; stylistId?: string }) {
  const theme = useAppTheme();
  const isRescheduling = Boolean(rescheduleId);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const source = useMemo(() => createHttpBookingAdapter(() => tokenRef.current), []);
  const dates = useMemo(() => upcomingDates(), []);
  const [page, setPage] = useState<"main" | "salons" | "services" | "wishes" | "reschedule">("main");
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [busy, setBusy] = useState<"branches" | "options" | "slots" | "service" | "confirm" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [result, setResult] = useState<AppointmentResult | null>(null);
  const [wishes, setWishes] = useState<BookingWishes>({});
  const [wishError, setWishError] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState(dates[0]?.key || "");
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotOption[]>([]);
  const [rescheduleSlot, setRescheduleSlot] = useState<SlotOption | null>(null);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [branchRevision, setBranchRevision] = useState(0);
  const [optionRevision, setOptionRevision] = useState(0);
  const [slotRevision, setSlotRevision] = useState(0);
  const [rescheduleLoading, setRescheduleLoading] = useState(Boolean(rescheduleId));
  const [rescheduleError, setRescheduleError] = useState("");
  const submitLock = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setPage("main");
    setDraft(emptyDraft);
    setResult(null);
    setWishes({});
    setNotice("");
    setError("");
    setRescheduleError("");
    if (rescheduleId) {
      setRescheduleLoading(true);
      void loadRescheduleDraft(rescheduleId, () => getCustomerAppointments(token), source,
        dates.map((date) => date.key)).then((loaded) => {
        if (active) setDraft(loaded);
      }).catch((cause) => {
        if (active) setRescheduleError(cause instanceof Error ? cause.message : "Không tải được lịch hẹn.");
      }).finally(() => { if (active) setRescheduleLoading(false); });
    } else {
      setRescheduleLoading(false);
      if (branchId && (serviceId || stylistId)) void (serviceId
        ? loadHomeServiceDraft(source, branchId, serviceId, dates[0]?.key || "")
        : loadHomeStylistDraft(source, branchId, stylistId!, dates[0]?.key || ""))
        .then((selected) => {
          if (!active) return;
          if (selected) setDraft(selected);
          else setNotice("Salon, dịch vụ hoặc stylist không còn khả dụng. Vui lòng chọn lại.");
        }).catch(() => {
          if (active) setNotice("Không tải được dịch vụ. Vui lòng thử lại.");
        });
    }
    return () => { active = false; };
  }, [rescheduleId, branchId, serviceId, stylistId, token, source, dates]));

  useEffect(() => {
    let active = true;
    setBusy("branches"); setError("");
    source.listBranches().then((data) => { if (active) setBranches(data); })
      .catch(() => { if (active) setError("Không tải được danh sách salon."); })
      .finally(() => { if (active) setBusy(null); });
    return () => { active = false; };
  }, [source, branchRevision]);

  useEffect(() => {
    if (!draft.branch) return;
    let active = true;
    setBusy("options"); setError("");
    Promise.all([source.listServices(draft.branch.id), source.listStylists(draft.branch.id)])
      .then(([nextServices, nextStylists]) => {
        if (active) { setServices(nextServices); setStylists(nextStylists); }
      }).catch(() => { if (active) setError("Không tải được stylist hoặc dịch vụ."); })
      .finally(() => { if (active) setBusy(null); });
    return () => { active = false; };
  }, [draft.branch?.id, source, optionRevision]);

  useEffect(() => {
    if (!draft.branch || !draft.service || !draft.stylist || !draft.date) {
      setSlots([]);
      return;
    }
    let active = true;
    setBusy("slots"); setError("");
    source.listTimeSlots({
      branchId: draft.branch.id, stylistId: draft.stylist.id, date: draft.date,
      serviceId: draft.service.id,
      ...(rescheduleId ? { excludeAppointmentId: rescheduleId } : {}),
    }).then((serviceSlots) => {
      if (!active) return;
      const nextSlots = mergeSlotOptions([{ serviceId: draft.service!.id, slots: serviceSlots }]);
      setSlots(nextSlots);
      setDraft((current) => current.slot && !nextSlots.some((option) =>
        option.startTime === current.slot?.startTime && Boolean(slotForService(option, current.service!.id)))
        ? { ...current, slot: null } : current);
    }).catch(() => {
      if (active) setError("Không tải được giờ trống. Vui lòng thử lại.");
    }).finally(() => { if (active) setBusy(null); });
    return () => { active = false; };
  }, [draft.branch?.id, draft.stylist?.id, draft.date, draft.service?.id, services, source, slotRevision, rescheduleId]);

  useEffect(() => {
    if (page !== "main" || !draft.branch || !draft.stylist || !draft.date) return;
    const timer = setInterval(() => setSlotRevision((revision) => revision + 1), 30_000);
    return () => clearInterval(timer);
  }, [page, draft.branch?.id, draft.stylist?.id, draft.date]);

  const cities = [...new Set(branches.map((branch) => branch.address.split(",").at(-1)?.trim() || ""))]
    .filter(Boolean).sort();
  const open = (target: "salons" | "services") => {
    if (isRescheduling && target === "salons") return;
    setSearch(""); setCity(""); setError(""); setPage(target);
  };
  const selectBranch = (branch: Branch) => {
    if (isRescheduling) return;
    setServices([]); setStylists([]); setSlots([]);
    setDraft({ ...emptyDraft, branch, date: dates[0]?.key || null });
    setNotice(""); setPage("main");
  };
  const selectService = async (service: Service) => {
    if (isRescheduling) {
      setSlots([]);
      setDraft((current) => ({ ...current, service, slot: null }));
      setNotice(""); setPage("main");
      return;
    }
    setSlots([]);
    setDraft((current) => ({ ...current, service, slot: null }));
    setNotice(""); setPage("main");
  };
  const confirm = async (includeWishes: boolean) => {
    if (isRescheduling) return;
    if (submitLock.current || !isCompleteBookingDraft(draft)) return;
    submitLock.current = true; setBusy("confirm"); setNotice("");
    try { setResult(await source.confirmBooking(draft, includeWishes ? wishes : undefined)); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Không thể đặt lịch lúc này."); }
    finally { setBusy(null); submitLock.current = false; }
  };
  const confirmExistingReschedule = async () => {
    if (!rescheduleId || submitLock.current || !isCompleteBookingDraft(draft)) return;
    submitLock.current = true; setBusy("confirm"); setNotice("");
    try {
      await rescheduleCustomerAppointment(token, rescheduleId, draft.slot, draft.service.id);
      router.replace("/(customer)/appointments");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Không đổi được lịch hẹn. Vui lòng chọn giờ khác.");
      setSlotRevision((revision) => revision + 1);
    } finally { setBusy(null); submitLock.current = false; }
  };
  const chooseReference = async () => {
    if ((wishes.referenceImages?.length || 0) >= 3) return;
    try {
      const choice = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (choice.canceled || !choice.assets[0]) return;
      let width = 480;
      for (let attempt = 0; attempt < 4; attempt++) {
        const image = await ImageManipulator.manipulateAsync(choice.assets[0].uri,
          [{ resize: { width } }], { compress: Math.max(0.3, 0.65 - attempt * 0.12),
            format: ImageManipulator.SaveFormat.JPEG, base64: true });
        if (image.base64 && image.base64.length <= 135000) {
          setWishes((current) => ({ ...current, referenceImages: [...(current.referenceImages || []),
            `data:image/jpeg;base64,${image.base64}`] }));
          setWishError(""); return;
        }
        width = Math.round(width * 0.7);
      }
      setWishError("Ảnh quá lớn. Vui lòng chọn ảnh khác.");
    } catch { setWishError("Không chọn được ảnh. Vui lòng thử lại."); }
  };
  useEffect(() => {
    if (page !== "reschedule" || !result) return;
    let active = true;
    setRescheduleBusy(true); setRescheduleSlots([]); setRescheduleSlot(null); setWishError("");
    const booking = result.booking;
    source.listTimeSlots({ branchId: booking.branch.id, serviceId: booking.service.id,
      stylistId: booking.stylist.id, date: rescheduleDate }).then((items) => {
      if (active) setRescheduleSlots(mergeSlotOptions([{ serviceId: booking.service.id, slots: items }]));
    }).catch(() => { if (active) setWishError("Không tải được giờ trống. Vui lòng thử lại."); })
      .finally(() => { if (active) setRescheduleBusy(false); });
    return () => { active = false; };
  }, [page, rescheduleDate, result, source]);
  const saveReschedule = async () => {
    if (!result || !rescheduleSlot || rescheduleBusy) return;
    const next = slotForService(rescheduleSlot, result.booking.service.id);
    if (!next) return;
    setRescheduleBusy(true); setWishError("");
    try {
      await rescheduleCustomerAppointment(token, result.id, next);
      setResult({ ...result, booking: { ...result.booking, date: rescheduleDate, slot: next } });
      setPage("main");
    } catch (cause) { setWishError(cause instanceof Error ? cause.message : "Không đổi được lịch hẹn."); }
    finally { setRescheduleBusy(false); }
  };
  const cancelBooking = () => {
    if (!result) return;
    Alert.alert("Hủy lịch hẹn?", "Lịch hẹn này sẽ bị hủy.", [
      { text: "Giữ lịch", style: "cancel" },
      { text: "Hủy lịch", style: "destructive", onPress: () => {
        setRescheduleBusy(true);
        void cancelCustomerAppointment(token, result.id).then(() => router.replace("/(customer)/appointments"))
          .catch((cause) => Alert.alert("Không thể hủy lịch", cause instanceof Error ? cause.message : "Vui lòng thử lại."))
          .finally(() => setRescheduleBusy(false));
      } },
    ]);
  };
  const header = (title: string, back: () => void) => <View style={[styles.header,
    { backgroundColor: theme.surfaceHighlight }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={back} style={styles.back}>
      <Ionicons name="arrow-back" size={24} color={theme.brand} /></Pressable>
    <Text style={[styles.headerTitle, { color: theme.brand }]}>{title}</Text><View style={styles.back} />
  </View>;
  const warning = error ? <View style={[styles.warning, { backgroundColor: theme.surfaceHighlight }]}>
    <Text style={{ color: theme.text }}>{error}</Text>
    <Pressable accessibilityRole="button" onPress={() => {
      if (page === "salons") setBranchRevision((n) => n + 1);
      else if (page === "services" || !draft.stylist) setOptionRevision((n) => n + 1);
      else setSlotRevision((n) => n + 1);
    }}><Text style={{ color: theme.brand, fontWeight: "800" }}>Thử lại</Text></Pressable>
  </View> : null;

  if (result && page === "reschedule") return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    {header("Đổi lịch hẹn", () => setPage("main"))}
    <ScrollView contentContainerStyle={styles.listContent}>
      <Text style={[styles.rowTitle, { color: theme.text }]}>{result.booking.branch.name}</Text>
      <Text style={{ color: theme.textMuted }}>Stylist: {result.booking.stylist.name} · {result.booking.service.name}</Text>
      <Text style={[styles.subTitle, { color: theme.brand }]}>Chọn ngày mới</Text>
      <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
        {dates.map((date) => <Pressable key={date.key} onPress={() => setRescheduleDate(date.key)}
          style={[styles.chip, { borderColor: date.key === rescheduleDate ? theme.brand : theme.border }]}>
          <Text style={{ color: date.key === rescheduleDate ? theme.brand : theme.text }}>{date.label}</Text>
        </Pressable>)}
      </ScrollView>
      <Text style={[styles.subTitle, { color: theme.brand }]}>Chọn giờ mới</Text>
      {rescheduleBusy ? <ActivityIndicator color={theme.brand} /> : null}
      {wishError ? <Text style={{ color: "#B91C1C" }}>{wishError}</Text> : null}
      {!rescheduleBusy && rescheduleSlots.length === 0 ? <Text style={{ color: theme.textMuted }}>
        Chưa có giờ trống trong ngày này.</Text> : null}
      <View style={styles.slotGrid}>{rescheduleSlots.map((option) => <Pressable key={option.startTime}
        accessibilityRole="button" accessibilityState={{ disabled: option.serviceIds.length === 0 }}
        disabled={option.serviceIds.length === 0} onPress={() => setRescheduleSlot(option)}
        style={[styles.slot, { backgroundColor: rescheduleSlot?.startTime === option.startTime ? theme.brand : theme.surface,
          borderColor: rescheduleSlot?.startTime === option.startTime ? theme.brand : theme.border,
          opacity: option.serviceIds.length === 0 ? 0.38 : 1 }]}>
        <Text style={{ color: rescheduleSlot?.startTime === option.startTime ? "#FFFFFF" : theme.text }}>{hour(option.startTime)}</Text>
      </Pressable>)}</View>
      <Pressable disabled={!rescheduleSlot || rescheduleBusy} onPress={() => void saveReschedule()}
        style={[styles.primary, { backgroundColor: rescheduleSlot ? theme.brand : theme.surfaceMuted }]}>
        <Text style={styles.primaryText}>Xác nhận đổi lịch</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;

  if (result) return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    {header("Đặt lịch thành công", () => router.replace("/(customer)/home"))}
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={[styles.successCard, { backgroundColor: theme.brand }]}>
        <View style={styles.successTop}><Text style={styles.successKicker}>ĐẶT LỊCH THÀNH CÔNG</Text>
          <Text style={styles.successStatus}>✓ Đã xác nhận</Text></View>
        <Text style={styles.successGreeting}>Hẹn gặp {customerName}{customerPhone ? ` · ${customerPhone}` : ""}</Text>
        <View style={styles.successDetails}><View style={{ flex: 1 }}>
          <Text style={styles.successTime}>{hour(result.booking.slot.startTime)}</Text>
          <Text style={styles.successLabel}>{formatDate(result.booking.date)}</Text></View>
          <View style={styles.successPrice}><Text style={styles.successLabel}>Giá dịch vụ</Text>
            <Text style={styles.successAmount}>{money(result.bookedPrice ?? result.booking.service.priceVnd)}</Text></View></View>
      </View>
      <View style={[styles.listRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="location" size={23} color={theme.brand} /><View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: theme.text }]}>{result.booking.branch.name}</Text>
          <Text style={{ color: theme.textMuted }}>{result.booking.branch.address}</Text></View></View>
      <View style={[styles.listRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="cut-outline" size={23} color={theme.brand} /><View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: theme.text }]}>{result.booking.service.name}</Text>
          <Text style={{ color: theme.textMuted }}>Stylist: {result.booking.stylist.name}</Text></View>
        <Text style={{ color: theme.brand, fontWeight: "800" }}>
          {money(result.bookedPrice ?? result.booking.service.priceVnd)}</Text></View>
      <Text style={{ color: theme.textMuted }}>Mã lịch hẹn: {result.id}</Text>
      <View style={styles.successActions}>
        <Pressable accessibilityRole="button" onPress={() => { setRescheduleDate(result.booking.date);
          setPage("reschedule"); }} style={[styles.secondaryAction, { borderColor: theme.brand }]}>
          <Text style={{ color: theme.brand, fontWeight: "800" }}>⇄ Đổi lịch hẹn</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={rescheduleBusy} onPress={cancelBooking}
          style={[styles.secondaryAction, { borderColor: theme.border }]}>
          <Text style={{ color: theme.textMuted, fontWeight: "800" }}>× Hủy lịch</Text></Pressable>
      </View>
      <Pressable onPress={() => router.replace("/(customer)/appointments")}
        style={[styles.primary, { backgroundColor: theme.brand }]}><Text style={styles.primaryText}>Xem lịch hẹn của tôi</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;

  if (page === "wishes") return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    {header("Chia sẻ mong muốn", () => setPage("main"))}
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContent}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>Chọn kiểu tóc anh thích (tối đa 3 ảnh)</Text>
        <View style={styles.imageRow}>
          {Array.from({ length: 3 }, (_, index) => {
            const uri = wishes.referenceImages?.[index];
            return <Pressable key={index} accessibilityRole="button"
              onPress={() => uri ? setWishes((current) => ({ ...current,
                referenceImages: current.referenceImages?.filter((_, i) => i !== index) })) : void chooseReference()}
              style={[styles.imageSlot, { borderColor: theme.border }]}>
              {uri ? <Image source={{ uri }} style={styles.referenceImage} />
                : <><Ionicons name="image-outline" size={30} color={theme.textDim} />
                  <Text style={{ color: theme.textMuted, textAlign: "center" }}>Chọn ảnh</Text></>}
            </Pressable>;
          })}
        </View>
        <Text style={{ color: theme.textMuted }}>Chạm vào ảnh đã chọn để xóa.</Text>
        <Text style={[styles.rowTitle, { color: theme.text }]}>Mong muốn về stylist (không bắt buộc)</Text>
        <TextInput accessibilityLabel="Mong muốn về stylist" value={wishes.stylistPreference || ""}
          onChangeText={(value) => setWishes((current) => ({ ...current, stylistPreference: value }))}
          maxLength={100} placeholder="VD: Tư vấn kiểu tóc phù hợp" placeholderTextColor={theme.textDim}
          style={[styles.wishInput, { borderColor: theme.border, color: theme.text }]} />
        <Text style={[styles.rowTitle, { color: theme.text }]}>Yêu cầu đặc biệt</Text>
        <Text style={{ color: theme.textMuted }}>
          Anh có thể ghi nhu cầu cạo mặt, mong muốn không gian yên tĩnh hoặc không chụp ảnh sau khi cắt.
        </Text>
        <TextInput accessibilityLabel="Yêu cầu đặc biệt" value={wishes.specialRequest || ""}
          onChangeText={(value) => setWishes((current) => ({ ...current, specialRequest: value }))}
          maxLength={500} multiline placeholder="VD: Tư vấn kiểu tóc, tránh cắt quá ngắn..."
          placeholderTextColor={theme.textDim} style={[styles.wishInput, styles.wishMultiline,
            { borderColor: theme.border, color: theme.text }]} />
        {wishError ? <Text style={{ color: "#B91C1C" }}>{wishError}</Text> : null}
        {notice ? <Text style={{ color: "#B91C1C" }}>{notice}</Text> : null}
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }, styles.wishFooter]}>
        <Pressable disabled={busy === "confirm"} onPress={() => void confirm(false)}
          style={[styles.wishButton, { borderColor: theme.brand }]}><Text style={{ color: theme.brand, fontWeight: "800" }}>BỎ QUA</Text></Pressable>
        <Pressable disabled={busy === "confirm"} onPress={() => void confirm(true)}
          style={[styles.wishButton, { backgroundColor: theme.brand }]}>
          {busy === "confirm" ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>HOÀN TẤT</Text>}</Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;

  if (page === "salons" || page === "services") {
    const salonPage = page === "salons";
    const filteredBranches = branches.filter((branch) => (!city || branch.address.includes(city)) &&
      (branch.name + " " + branch.address).toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
    const filteredServices = services.filter((service) =>
      service.name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
    return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      {header(salonPage ? "Chọn salon" : "Chọn dịch vụ", () => setPage("main"))}
      <View style={[styles.searchArea, { backgroundColor: theme.surfaceHighlight }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput accessibilityLabel={salonPage ? "Tìm salon" : "Tìm dịch vụ"}
            value={search} onChangeText={setSearch} placeholder={salonPage
              ? "Tìm tên hoặc địa chỉ salon" : "Tìm dịch vụ"} placeholderTextColor={theme.textDim}
            style={[styles.searchInput, { color: theme.text }]} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {salonPage && cities.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {["Tất cả", ...cities].map((name) => <Pressable key={name}
            onPress={() => setCity(name === "Tất cả" ? "" : name)}
            style={[styles.chip, { borderColor: city === name || (!city && name === "Tất cả")
              ? theme.brand : theme.border }]}>
            <Text style={{ color: theme.text }}>{name}</Text></Pressable>)}
        </ScrollView> : null}
        <Text style={[styles.listHeading, { color: theme.brand }]}>{salonPage
          ? "Salon hiện có" : "Dịch vụ tại " + draft.branch?.name}</Text>
        {busy === (salonPage ? "branches" : "options") ? <ActivityIndicator color={theme.brand} /> : null}
        {warning}
        {salonPage && !busy && filteredBranches.length === 0
          ? <Text style={{ color: theme.textMuted }}>Không tìm thấy salon phù hợp.</Text> : null}
        {!salonPage && !busy && filteredServices.length === 0
          ? <Text style={{ color: theme.textMuted }}>Không tìm thấy dịch vụ phù hợp.</Text> : null}
        {salonPage ? filteredBranches.map((branch) => <Pressable key={branch.id}
          accessibilityRole="button" onPress={() => selectBranch(branch)}
          style={[styles.listRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="storefront-outline" size={25} color={theme.brand} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{branch.name}</Text>
            <Text style={{ color: theme.textMuted }}>{branch.address}</Text>
          </View><Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>) : filteredServices.map((service) => <Pressable key={service.id}
          accessibilityRole="button" disabled={busy === "service"}
          onPress={() => void selectService(service)}
          style={[styles.listRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="cut-outline" size={25} color={theme.brand} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{service.name}</Text>
            <Text style={{ color: theme.textMuted }}>{service.durationMinutes} phút</Text>
            <Text style={{ color: theme.brand, fontWeight: "800" }}>{money(service.priceVnd)}</Text>
          </View>{busy === "service" ? <ActivityIndicator color={theme.brand} />
            : <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />}
        </Pressable>)}
      </ScrollView>
    </SafeAreaView>;
  }

  if (isRescheduling && (rescheduleLoading || rescheduleError)) return <SafeAreaView
    style={[styles.root, { backgroundColor: theme.surface }]}>
    {header("Đổi ngày / giờ", () => router.replace("/(customer)/appointments"))}
    <View style={{ padding: 24, gap: 18 }}>
      {rescheduleLoading ? <ActivityIndicator color={theme.brand} /> : <>
        <Text style={{ color: theme.text }}>{rescheduleError}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/(customer)/appointments")}>
          <Text style={{ color: theme.brand, fontWeight: "700" }}>Quay lại lịch hẹn</Text>
        </Pressable>
      </>}
    </View>
  </SafeAreaView>;
  const complete = isCompleteBookingDraft(draft) && busy !== "confirm";
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.surface }]}>
    {header(isRescheduling ? "Đổi ngày / giờ" : "Đặt lịch giữ chỗ",
      () => router.replace(isRescheduling ? "/(customer)/appointments" : "/(customer)/home"))}
    <ScrollView contentContainerStyle={styles.flowContent} showsVerticalScrollIndicator={false}>
      {notice ? <View style={[styles.warning, { backgroundColor: theme.surfaceHighlight }]}>
        <Text style={{ color: theme.text }}>{notice}</Text></View> : null}
      <View style={[styles.timeline, { borderLeftColor: theme.border }]}>
        <View style={styles.stage}>
          <View style={[styles.dot, { backgroundColor: theme.brand }]}>
            {draft.branch ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}</View>
          <Text style={[styles.title, { color: theme.brand }]}>{isRescheduling ? "1. Salon hiện tại" : "1. Chọn salon"}</Text>
          <Pressable accessibilityRole="button" disabled={isRescheduling} onPress={() => open("salons")}
            style={[styles.actionRow, { backgroundColor: theme.surfaceHighlight }]}>
            <Ionicons name="home-outline" size={22} color={theme.text} />
            <Text style={[styles.actionText, { color: draft.branch ? theme.text : theme.textMuted }]}
              numberOfLines={1}>{draft.branch ? draft.branch.name + " · " + draft.branch.address
                : "Xem tất cả salon"}</Text>
            <Ionicons name={isRescheduling ? "lock-closed-outline" : "chevron-forward"} size={18} color={theme.text} /></Pressable>
        </View>
        <View style={styles.stage}>
          <View style={[styles.dot, { backgroundColor: draft.service ? theme.brand : theme.border }]}>
            {draft.service ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}</View>
          <Text style={[styles.title, { color: theme.brand }]}>2. Chọn dịch vụ</Text>
          <Pressable accessibilityRole="button" disabled={!draft.branch || busy === "options"}
            onPress={() => open("services")}
            style={[styles.actionRow, { backgroundColor: theme.surfaceHighlight,
              opacity: draft.branch && busy !== "options" ? 1 : 0.55 }]}>
            <Ionicons name="cut-outline" size={22} color={theme.text} />
            <Text style={[styles.actionText, { color: draft.service ? theme.text : theme.textMuted }]}
              numberOfLines={1}>{draft.service?.name || "Xem tất cả dịch vụ"}</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.text} /></Pressable>
          {draft.service ? <>
            <View style={[styles.selectedService, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text, flex: 1 }}>{draft.service.name}</Text>
              <Text style={{ color: theme.brand, fontWeight: "800" }}>
                {money(draft.service.priceVnd)}</Text></View>
            <Text style={{ color: theme.brand, fontWeight: "700" }}>
              Tạm tính: {money(draft.service.priceVnd)}</Text>
          </> : null}
        </View>
        <View style={styles.stage}>
          <View style={[styles.dot, { backgroundColor: draft.slot ? theme.brand : theme.border }]}>
            {draft.slot ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}</View>
          <Text style={[styles.title, { color: theme.brand }]}>{isRescheduling
            ? "3. Chọn lại ngày và giờ" : "3. Chọn ngày, giờ & stylist"}</Text>
          {!draft.service ? <Text style={{ color: theme.textMuted }}>Chọn dịch vụ để xem giờ phù hợp.</Text> : <>
            {busy === "options" ? <ActivityIndicator color={theme.brand} /> : null}
            {warning}
            {(isRescheduling ? !draft.stylist : stylists.length === 0) && busy !== "options" && !error
              ? <Text style={{ color: theme.textMuted }}>Salon chưa có stylist khả dụng.</Text> : null}
            {(isRescheduling ? Boolean(draft.stylist) : stylists.length > 0) ? <>
              <Text style={[styles.subTitle, { color: theme.text }]}>{isRescheduling ? "Stylist đã chọn" : "Chọn stylist"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stylistRow}>
                {(isRescheduling && draft.stylist ? [draft.stylist] : stylists).map((stylist) => {
                  const selected = draft.stylist?.id === stylist.id;
                  return <Pressable key={stylist.id} accessibilityRole="button" disabled={isRescheduling}
                    accessibilityState={{ selected }}
                    onPress={() => { setSlots([]); setDraft((current) => ({ ...current, stylist, slot: null })); setNotice(""); }}
                    style={[styles.stylistCard, { borderColor: selected ? theme.brand : theme.border,
                      backgroundColor: selected ? theme.surfaceHighlight : theme.surface }]}>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.brand}
                      style={styles.selectedMark} /> : null}
                    <View style={[styles.avatar, { backgroundColor: theme.brandMuted }]}>
                      <Ionicons name="person" size={27} color={theme.brand} /></View>
                    <Text style={[styles.stylistName, { color: theme.text }]}
                      numberOfLines={2}>{stylist.name}</Text>
                  </Pressable>;
                })}
              </ScrollView>
              <Pressable accessibilityRole="button" onPress={() => setDateOpen(!dateOpen)}
                style={[styles.actionRow, { backgroundColor: theme.surfaceHighlight }]}>
                <Ionicons name="calendar-outline" size={22} color={theme.text} />
                <Text style={[styles.actionText, { color: theme.text }]} numberOfLines={1}>
                  {draft.date ? formatDate(draft.date) : "Chọn ngày"}</Text>
                <Ionicons name={dateOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.text} />
              </Pressable>
              {dateOpen ? <View style={[styles.dateList, { borderColor: theme.border }]}>
                {dates.map((date) => <Pressable key={date.key} accessibilityRole="button"
                  onPress={() => { setSlots([]); setDraft((current) => ({ ...current, date: date.key, slot: null }));
                    setDateOpen(false); setNotice(""); }} style={styles.dateItem}>
                  <Text style={{ color: draft.date === date.key ? theme.brand : theme.text }}>
                    {formatDate(date.key)}</Text>
                  {draft.date === date.key ? <Ionicons name="checkmark" size={18} color={theme.brand} /> : null}
                </Pressable>)}</View> : null}
              {!draft.stylist ? <Text style={{ color: theme.textMuted }}>
                Chọn stylist để xem giờ trống.</Text> : null}
              {busy === "slots" ? <ActivityIndicator color={theme.brand} /> : null}
              {draft.stylist && slots.length === 0 && busy !== "slots" && !error
                ? <Text style={{ color: theme.textMuted }}>
                  Chưa có giờ trống. Hãy chọn ngày hoặc stylist khác.</Text> : null}
              {slots.length > 0 ? <View style={styles.slotGrid}>{slots.map((option) => {
                const unavailable = option.serviceIds.length === 0;
                const selected = !unavailable && draft.slot?.startTime === option.startTime;
                return <Pressable key={option.startTime} accessibilityRole="button"
                  accessibilityState={{ selected, disabled: unavailable }} disabled={unavailable} onPress={() => {
                    const slot = slotForService(option, draft.service!.id);
                    if (slot) { setDraft((current) => ({ ...current, slot })); setNotice(""); }
                  }} style={[styles.slot, { backgroundColor: selected ? theme.brand : theme.surface,
                    borderColor: selected ? theme.brand : theme.border, opacity: unavailable ? 0.38 : 1 }]}>
                  <Text style={{ color: selected ? "#FFFFFF" : theme.text, fontWeight: "700" }}>
                    {hour(option.startTime)}</Text></Pressable>;
              })}</View> : null}
            </> : null}
          </>}
        </View>
      </View>
    </ScrollView>
    <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !complete, busy: busy === "confirm" }}
        disabled={!complete} onPress={() => {
          if (isRescheduling) void confirmExistingReschedule();
          else { setNotice(""); setPage("wishes"); }
        }}
        style={[styles.primary, { backgroundColor: complete ? theme.brand : theme.surfaceMuted }]}>
        {busy === "confirm" ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={[styles.primaryText, { color: complete ? "#FFFFFF" : theme.textMuted }]}>
            {isRescheduling ? "XÁC NHẬN ĐỔI LỊCH" : "CHỐT GIỜ CẮT"}</Text>}</Pressable>
      <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: "center" }}>
        Thanh toán sau khi hoàn tất dịch vụ tại salon</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { height: 54, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between" }, back: { width: 54, height: 54, alignItems: "center",
    justifyContent: "center" }, headerTitle: { fontSize: 19, fontWeight: "800" },
  flowContent: { padding: 20, paddingTop: 28, paddingBottom: 45 },
  timeline: { marginLeft: 9, borderLeftWidth: 2, paddingLeft: 27, gap: 40 },
  stage: { position: "relative", gap: 14 },
  dot: { position: "absolute", left: -38, top: 2, width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800" },
  actionRow: { minHeight: 55, borderRadius: 8, paddingHorizontal: 14,
    flexDirection: "row", alignItems: "center", gap: 10 }, actionText: { flex: 1, fontSize: 15 },
  subTitle: { fontSize: 15, fontWeight: "700" }, stylistRow: { gap: 10, paddingVertical: 4 },
  stylistCard: { width: 110, minHeight: 116, borderWidth: 1.5, borderRadius: 11,
    padding: 10, alignItems: "center", justifyContent: "center", gap: 8 },
  selectedMark: { position: "absolute", top: -7, right: -6 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  stylistName: { textAlign: "center", fontSize: 13, fontWeight: "700" },
  dateList: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  dateItem: { minHeight: 47, paddingHorizontal: 14, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { minWidth: "30%", flexGrow: 1, borderWidth: 1, borderRadius: 8,
    minHeight: 48, alignItems: "center", justifyContent: "center" },
  selectedService: { borderWidth: 1, borderRadius: 8, padding: 12,
    flexDirection: "row", alignItems: "center", gap: 10 },
  footer: { padding: 14, borderTopWidth: 1, gap: 10 },
  primary: { minHeight: 50, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  listContent: { padding: 18, gap: 14, paddingBottom: 48 }, searchArea: { padding: 16 },
  searchBox: { borderWidth: 1, borderRadius: 12, minHeight: 50,
    paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontSize: 15 }, chipRow: { gap: 8, paddingVertical: 5 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  listHeading: { fontSize: 18, fontWeight: "800" },
  listRow: { borderWidth: 1, borderRadius: 12, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  warning: { padding: 12, borderRadius: 10, gap: 6 },
  imageRow: { flexDirection: "row", gap: 10 },
  imageSlot: { flex: 1, aspectRatio: 1, borderWidth: 1.5, borderStyle: "dashed",
    borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  referenceImage: { width: "100%", height: "100%" },
  wishInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, minHeight: 50, fontSize: 15 },
  wishMultiline: { minHeight: 105, textAlignVertical: "top", paddingTop: 12 },
  wishFooter: { flexDirection: "row" },
  wishButton: { flex: 1, minHeight: 52, borderWidth: 1, borderRadius: 9,
    alignItems: "center", justifyContent: "center" },
  successCard: { borderRadius: 22, padding: 20, gap: 24 },
  successTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  successKicker: { color: "#BFDBFE", fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  successStatus: { color: "#DCFCE7", fontSize: 12, fontWeight: "800" },
  successGreeting: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  successDetails: { backgroundColor: "#FFFFFF22", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center" },
  successTime: { color: "#FFFFFF", fontSize: 40, fontWeight: "900" },
  successLabel: { color: "#DBEAFE", fontSize: 13 },
  successPrice: { borderLeftWidth: 1, borderLeftColor: "#FFFFFF55", paddingLeft: 14, gap: 6 },
  successAmount: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  successActions: { flexDirection: "row", gap: 12 },
  secondaryAction: { flex: 1, minHeight: 54, borderWidth: 1, borderRadius: 10,
    alignItems: "center", justifyContent: "center" },
});
