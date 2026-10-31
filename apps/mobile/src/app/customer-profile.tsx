import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/constants/theme";
import { getCustomerProfile, ProfileRequestError, saveProfileDraft, updateCustomerProfile,
  type CustomerProfile, type ProfileDraft } from "@/customer/profile-api";
import { useAuth } from "@/providers/auth-provider";
import { formatBirthDate, provinces, toBirthDate, wardsForProvince } from "@/customer/profile-options";
import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";

const emptyAddress = { province: "", district: "", ward: "", streetAddress: "" };
const asDraft = (profile: CustomerProfile): ProfileDraft => ({ name: profile.name, email: profile.email || "",
  birthDate: profile.birthDate || "", avatar: profile.avatar,
  homeAddress: profile.homeAddress || { ...emptyAddress } });

export default function CustomerProfileScreen() {
  const theme = useAppTheme();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const { token, user, logout, setAuth } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<"province" | "ward" | null>(null);
  const [search, setSearch] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [dateParts, setDateParts] = useState({ day: 1, month: 1, year: 2000 });

  const handleUnauthorized = useCallback(() => {
    logout();
    setProfile(null);
    setDraft(null);
    router.replace("/login?next=profile");
  }, [logout]);

  const load = useCallback(async () => {
    if (!token) { router.replace("/login?next=profile"); return; }
    setLoading(true); setError(null); setProfile(null); setDraft(null); setEditing(false);
    try {
      const next = await getCustomerProfile(token);
      setProfile(next); setDraft(asDraft(next));
    } catch (cause) {
      if (cause instanceof ProfileRequestError && cause.status === 401) handleUnauthorized();
      else setError(cause instanceof Error ? cause.message : "Không tải được hồ sơ.");
    } finally { setLoading(false); }
  }, [token, handleUnauthorized]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const chooseAvatar = async () => {
    try {
      const choice = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true,
        aspect: [1, 1], quality: 0.8 });
      if (choice.canceled || !choice.assets[0] || !draft) return;
      let width = 512;
      for (let attempt = 0; attempt < 4; attempt++) {
        const resized = await ImageManipulator.manipulateAsync(choice.assets[0].uri,
          [{ resize: { width } }], { compress: Math.max(0.35, 0.8 - attempt * 0.15),
            format: ImageManipulator.SaveFormat.JPEG, base64: true });
        if (resized.base64 && Math.ceil(resized.base64.length * 3 / 4) <= 200 * 1024) {
          setDraft({ ...draft, avatar: `data:image/jpeg;base64,${resized.base64}` });
          return;
        }
        width = Math.floor(width * 0.7);
      }
      Alert.alert("Ảnh quá lớn", "Vui lòng chọn ảnh khác.");
    } catch { Alert.alert("Không chọn được ảnh", "Vui lòng kiểm tra quyền truy cập ảnh và thử lại."); }
  };

  const save = async () => {
    if (!token || !draft) return;
    setSaving(true); setError(null);
    const result = await saveProfileDraft(draft, (patch) => updateCustomerProfile(token, patch));
    setSaving(false);
    if (result.error) {
      if (result.cause instanceof ProfileRequestError && result.cause.status === 401) handleUnauthorized();
      else setError(result.error);
      return;
    }
    if (result.profile) {
      setProfile(result.profile); setDraft(asDraft(result.profile)); setEditing(false);
      if (user && user.name !== result.profile.name) setAuth(token, { ...user, name: result.profile.name });
    }
  };

  const input = (label: string, value: string, change: (value: string) => void, props: Record<string, unknown> = {}) =>
    <View style={styles.field} key={label}><Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      {editing ? <TextInput accessibilityLabel={label} style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        value={value} onChangeText={change} placeholder={label} placeholderTextColor={theme.textMuted} {...props} />
        : <Text style={[styles.value, { color: theme.text }]}>{value || "Chưa cập nhật"}</Text>}</View>;

  const openDate = () => {
    if (!draft) return;
    const [year, month, day] = draft.birthDate ? draft.birthDate.split("-").map(Number) : [2000, 1, 1];
    setDateParts({ day, month, year });
    setDateOpen(true);
  };
  const selectField = (label: string, value: string, kind: "province" | "ward", disabled = false) =>
    <View style={styles.field}><Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      {editing ? <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
        onPress={() => { setSearch(""); setPicker(kind); }} style={[styles.input, styles.select,
          { borderColor: theme.border, opacity: disabled ? 0.5 : 1 }]}>
        <Text style={{ color: value ? theme.text : theme.textMuted, fontSize: 16 }}>{value || (disabled ? "Chọn tỉnh/thành phố trước" : `Chọn ${label.toLowerCase()}`)}</Text>
        <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
      </Pressable> : <Text style={[styles.value, { color: theme.text }]}>{value || "Chưa cập nhật"}</Text>}
    </View>;

  if (!token) return null;
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <KeyboardAwareScrollView scrollRef={scrollRef} contentContainerStyle={styles.content}>
      <View style={styles.top}><Pressable accessibilityRole="button" onPress={() => router.replace("/(customer)/account")}>
        <Ionicons name="arrow-back" size={25} color={theme.brand} /></Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Thông tin tài khoản</Text><View style={{ width: 25 }} /></View>
      {loading ? <ActivityIndicator color={theme.brand} /> : null}
      {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text>
        {!profile ? <Pressable onPress={() => void load()}><Text style={{ color: theme.brand, fontWeight: "800" }}>Thử lại</Text></Pressable> : null}</View> : null}
      {profile && draft ? <>
        <View style={[styles.banner, { backgroundColor: theme.brand }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Ảnh đại diện" disabled={!editing} onPress={() => void chooseAvatar()}
          style={[styles.avatar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {draft.avatar ? <Image source={{ uri: draft.avatar }} style={styles.avatarImage} />
            : <Ionicons name="person" size={48} color={theme.brand} />}
          {editing ? <Ionicons name="camera" size={20} color={theme.brand} /> : null}
        </Pressable>
        {editing && draft.avatar ? <Pressable onPress={() => setDraft({ ...draft, avatar: null })}>
          <Text style={[styles.remove, { color: theme.brand }]}>Xóa ảnh đại diện</Text></Pressable> : null}
        <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: theme.brand }]}>THÔNG TIN CÁ NHÂN</Text>
          <Pressable accessibilityRole="button" onPress={() => { setEditing(!editing); setError(null); setDraft(asDraft(profile)); }}>
            <Text style={{ color: theme.brand, fontWeight: "800" }}>{editing ? "Hủy" : "Chỉnh sửa"}</Text></Pressable></View>
        {input("Họ và tên", draft.name, (name) => setDraft({ ...draft, name }))}
        <View style={styles.field}><Text style={[styles.label, { color: theme.textMuted }]}>Số điện thoại</Text>
          <Text style={[styles.value, { color: theme.text }]}>{profile.phone}</Text></View>
        {input("Email", draft.email, (email) => setDraft({ ...draft, email }), { keyboardType: "email-address", autoCapitalize: "none" })}
        <View style={styles.field}><Text style={[styles.label, { color: theme.textMuted }]}>Ngày sinh (DD-MM-YYYY)</Text>
          {editing ? <Pressable accessibilityRole="button" accessibilityLabel="Chọn ngày sinh" onPress={openDate}
            style={[styles.input, styles.select, { borderColor: theme.border }]}>
            <Text style={{ color: draft.birthDate ? theme.text : theme.textMuted, fontSize: 16 }}>
              {formatBirthDate(draft.birthDate) || "Chọn ngày sinh"}</Text>
            <Ionicons name="calendar-outline" size={20} color={theme.textMuted} />
          </Pressable> : <Text style={[styles.value, { color: theme.text }]}>{formatBirthDate(draft.birthDate) || "Chưa cập nhật"}</Text>}
        </View>
        <Text onLayout={(event) => { if (section === "address") scrollRef.current?.scrollTo({
          y: Math.max(0, event.nativeEvent.layout.y - 24), animated: true }); }}
          style={[styles.sectionTitle, { color: theme.brand, marginTop: 12 }]}>ĐỊA CHỈ NHÀ (KHÔNG BẮT BUỘC)</Text>
        {selectField("Tỉnh/thành phố", draft.homeAddress.province, "province")}
        {selectField("Phường/xã", draft.homeAddress.ward, "ward", !draft.homeAddress.province)}
        {input("Số nhà và tên đường", draft.homeAddress.streetAddress, (streetAddress) => setDraft({ ...draft,
          homeAddress: { ...draft.homeAddress, streetAddress } }))}
        {editing && Object.values(draft.homeAddress).some(Boolean) ? <Pressable accessibilityRole="button"
          onPress={() => setDraft({ ...draft, homeAddress: { ...emptyAddress } })}>
          <Text style={{ color: theme.textMuted, alignSelf: "flex-end" }}>Xóa địa chỉ nhà</Text>
        </Pressable> : null}
        {editing ? <Pressable disabled={saving} style={[styles.primary, { backgroundColor: theme.brand }]}
          onPress={() => void save()}>{saving ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryText}>Lưu thay đổi</Text>}</Pressable> : null}
        <Pressable style={styles.logout} onPress={() => { logout(); router.replace("/(customer)/account"); }}>
          <Text style={{ color: theme.textMuted, fontWeight: "800" }}>ĐĂNG XUẤT</Text></Pressable>
      </> : null}
    </KeyboardAwareScrollView>
    <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.overlay}><View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={styles.sheetHead}><Text style={[styles.title, { color: theme.text }]}>
          Chọn {picker === "province" ? "tỉnh/thành phố" : "phường/xã"}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setPicker(null)}>
            <Ionicons name="close" size={25} color={theme.text} /></Pressable></View>
        <TextInput accessibilityLabel="Tìm kiếm địa chỉ" value={search} onChangeText={setSearch}
          placeholder="Tìm kiếm" placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
        <ScrollView keyboardShouldPersistTaps="handled">
          {(picker === "province" ? provinces : wardsForProvince(draft?.homeAddress.province || ""))
            .filter((name) => name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")))
            .map((name) => <Pressable key={name} accessibilityRole="button" onPress={() => {
              if (draft) setDraft({ ...draft, homeAddress: picker === "province"
                ? { ...draft.homeAddress, province: name, district: "", ward: "" }
                : { ...draft.homeAddress, district: "", ward: name } });
              setPicker(null);
            }} style={styles.option}><Text style={{ color: theme.text, fontSize: 16 }}>{name}</Text></Pressable>)}
        </ScrollView>
      </View></View>
      </KeyboardAvoidingView>
    </Modal>
    <Modal visible={dateOpen} transparent animationType="slide" onRequestClose={() => setDateOpen(false)}>
      <View style={styles.overlay}><View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={styles.sheetHead}><Text style={[styles.title, { color: theme.text }]}>Chọn ngày sinh</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setDateOpen(false)}>
            <Ionicons name="close" size={25} color={theme.text} /></Pressable></View>
        <View style={styles.dateColumns}>{([
          ["Ngày", "day", Array.from({ length: 31 }, (_, i) => i + 1)],
          ["Tháng", "month", Array.from({ length: 12 }, (_, i) => i + 1)],
          ["Năm", "year", Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => new Date().getFullYear() - i)],
        ] as const).map(([label, key, options]) => <View key={key} style={styles.dateColumn}>
          <Text style={[styles.label, { color: theme.textMuted, textAlign: "center" }]}>{label}</Text>
          <ScrollView>{options.map((value) => <Pressable key={value} accessibilityRole="button"
            onPress={() => setDateParts({ ...dateParts, [key]: value })}
            style={[styles.dateOption, dateParts[key] === value && { backgroundColor: theme.background }]}>
            <Text style={{ color: theme.text, fontWeight: dateParts[key] === value ? "800" : "400" }}>{value}</Text>
          </Pressable>)}</ScrollView></View>)}</View>
        <Pressable accessibilityRole="button" style={[styles.primary, { backgroundColor: theme.brand }]} onPress={() => {
          const value = toBirthDate(dateParts.day, dateParts.month, dateParts.year);
          if (!value) { Alert.alert("Ngày sinh không hợp lệ", "Vui lòng chọn ngày hợp lệ, không ở tương lai."); return; }
          if (draft) setDraft({ ...draft, birthDate: value });
          setDateOpen(false);
        }}><Text style={styles.primaryText}>Chọn ngày</Text></Pressable>
        <Pressable onPress={() => { if (draft) setDraft({ ...draft, birthDate: "" }); setDateOpen(false); }}
          style={styles.clearDate}><Text style={{ color: theme.textMuted }}>Xóa ngày sinh</Text></Pressable>
      </View></View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 20, paddingBottom: 45, gap: 12 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 19, fontWeight: "800" }, banner: { height: 105, borderRadius: 16, marginTop: 8 },
  avatar: { alignSelf: "center", width: 104, height: 104, borderRadius: 52, borderWidth: 2,
    marginTop: -55, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: 100, height: 100, borderRadius: 50 }, remove: { textAlign: "center", fontWeight: "700" },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "800" }, field: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D7DCE5", gap: 6 }, label: { fontSize: 13 }, value: { fontSize: 16, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, minHeight: 48, paddingHorizontal: 12, fontSize: 16 },
  select: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0008" },
  sheet: { maxHeight: "75%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  option: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D7DCE5" },
  dateColumns: { flexDirection: "row", height: 280, gap: 8 },
  dateColumn: { flex: 1 }, dateOption: { alignItems: "center", paddingVertical: 10, borderRadius: 8 },
  clearDate: { alignSelf: "center", padding: 12 },
  primary: { minHeight: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 14 },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  logout: { alignSelf: "center", padding: 15, marginTop: 15 },
  errorBox: { padding: 12, gap: 8 }, error: { color: "#B3261E" },
});
