// Login screen - role-based authentication entry
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-provider";
import { useRole } from "@/providers/role-provider";
import { staffLanding } from "@/providers/auth-utils";
import { useAppTheme } from "@/constants/theme";
import { customerLanding } from "@/customer/profile-navigation";
import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";

type Step = "phone" | "login" | "registerOtp" | "registerDetails" | "resetOtp" | "resetPassword";
const labels: Record<Step, [string, string]> = {
  phone: ["Chào mừng đến 30Shine", "Tiếp tục"], login: ["Đăng nhập khách hàng", "Đăng nhập"],
  registerOtp: ["Xác minh số điện thoại", "Xác minh OTP"], registerDetails: ["Tạo tài khoản", "Hoàn tất đăng ký"],
  resetOtp: ["Khôi phục mật khẩu", "Xác minh OTP"], resetPassword: ["Tạo mật khẩu mới", "Đặt lại mật khẩu"],
};

export default function EntryScreen() {
  const theme = useAppTheme();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { token, role, hydrated, login, lookupCustomer, requestCustomerCode, verifyCustomerCode,
    completeCustomerRegistration, loginCustomer, resetCustomerPassword } = useAuth();
  const { selectRole } = useRole();
  const [step, setStep] = useState<Step>("phone");
  const [staffMode, setStaffMode] = useState(false);
  const [staffHelp, setStaffHelp] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && token && role) {
      selectRole(role);
      router.replace(role === "customer" ? customerLanding(next) : staffLanding(role));
    }
  }, [hydrated, token, role, selectRole, next]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tiếp tục. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }

  async function submitCustomer() {
    if (step === "phone") {
      if (await lookupCustomer(phone)) setStep("login");
      else { await requestCustomerCode("register", phone); setStep("registerOtp"); }
    } else if (step === "login") {
      await loginCustomer(phone, password); selectRole("customer");
      router.replace(customerLanding(next));
    } else if (step === "registerOtp" || step === "resetOtp") {
      await verifyCustomerCode(step === "registerOtp" ? "register" : "reset", phone, code);
      setStep(step === "registerOtp" ? "registerDetails" : "resetPassword");
    } else if (step === "registerDetails") {
      await completeCustomerRegistration(phone, code, password, name); selectRole("customer");
      router.replace(customerLanding(next));
    } else {
      await resetCustomerPassword(phone, code, password); selectRole("customer");
      router.replace(customerLanding(next));
    }
  }

  async function submitStaff() {
    const account = await login(email, staffPassword);
    if (account.role !== "stylist" && account.role !== "general_manager") throw new Error("Tài khoản không được dùng app nhân sự.");
    selectRole(account.role); router.replace(staffLanding(account.role));
  }

  if (!hydrated) return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}><ActivityIndicator /></SafeAreaView>;
  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border }];
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <KeyboardAwareScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.brand, { color: theme.brand }]}>30SHINE MEMBER</Text>
      <Text style={[styles.title, { color: theme.text }]}>{staffMode ? (staffHelp ? "Quên mật khẩu?" : "Đăng nhập nhân sự") : labels[step][0]}</Text>
      {!staffMode && step === "phone" ? <Text style={{ color: theme.textMuted }}>Nhập số điện thoại để đăng nhập hoặc đăng ký. Bạn cũng có thể khám phá ứng dụng trước.</Text> : null}
      {staffMode && staffHelp ? <>
        <Text style={[styles.helpIntro, { color: theme.textMuted }]}>Tài khoản nhân sự được quản lý bởi System Admin.</Text>
        <Text style={[styles.helpBody, { color: theme.text }]}>Hãy liên hệ System Admin của 30Shine và cung cấp email đăng nhập để được đặt lại mật khẩu.</Text>
        {email.trim() ? <Text style={[styles.helpEmail, { color: theme.brand }]}>Email tài khoản: {email.trim()}</Text> : null}
        <Text style={[styles.helpNote, { color: theme.textMuted }]}>Không chia sẻ mật khẩu cũ hoặc mã đăng nhập với người khác.</Text>
        <Pressable accessibilityRole="button" style={[styles.primary, { backgroundColor: theme.brand }]}
          onPress={() => { setStaffHelp(false); setStaffPassword(""); setError(null); }}>
          <Text style={styles.primaryText}>Quay lại đăng nhập</Text>
        </Pressable>
      </> : staffMode ? <>
        <TextInput style={inputStyle} accessibilityLabel="Email nhân sự" placeholder="Email nhân sự" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <PasswordField label="Mật khẩu nhân sự" placeholder="Mật khẩu" value={staffPassword} onChangeText={setStaffPassword} visible={showStaffPassword} onToggle={() => setShowStaffPassword((value) => !value)} />
      </> : <>
        <TextInput style={inputStyle} accessibilityLabel="Số điện thoại khách hàng" placeholder="Số điện thoại Việt Nam" keyboardType="phone-pad" value={phone} onChangeText={setPhone} editable={step === "phone"} />
        {step === "registerOtp" || step === "resetOtp" ? <TextInput style={inputStyle} accessibilityLabel="Mã OTP" placeholder="Mã OTP 6 số trong log Auth Service" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} /> : null}
        {step === "registerDetails" ? <TextInput style={inputStyle} accessibilityLabel="Tên khách hàng" placeholder="Họ và tên" value={name} onChangeText={setName} /> : null}
        {step === "login" || step === "registerDetails" || step === "resetPassword" ? <PasswordField label="Mật khẩu khách hàng" placeholder="Mật khẩu gồm 6 chữ số" value={password} onChangeText={setPassword} visible={showCustomerPassword} onToggle={() => setShowCustomerPassword((value) => !value)} numeric /> : null}
      </>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!staffHelp ? <Pressable disabled={busy} style={[styles.primary, { backgroundColor: theme.brand }]} onPress={() => void run(staffMode ? submitStaff : submitCustomer)}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{staffMode ? "Đăng nhập nhân sự" : labels[step][1]}</Text>}
      </Pressable> : null}
      {staffMode && !staffHelp ? <View style={styles.staffLinks}>
        <Pressable accessibilityRole="button" style={styles.staffLink} onPress={() => { setStaffMode(false); setStaffHelp(false); setError(null); }}>
          <Text style={{ color: theme.textMuted }}>Quay lại phần khách hàng</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={[styles.staffLink, styles.staffLinkRight]}
          onPress={() => { setStaffHelp(true); setError(null); }}><Text style={{ color: theme.brand, fontWeight: "700" }}>Quên mật khẩu?</Text></Pressable>
      </View> : null}
      {!staffMode && step === "login" ? <Pressable style={styles.link} onPress={() => void run(async () => { await requestCustomerCode("reset", phone); setCode(""); setPassword(""); setStep("resetOtp"); })}><Text style={{ color: theme.brand }}>Quên mật khẩu?</Text></Pressable> : null}
      {!staffMode && (step === "registerOtp" || step === "resetOtp") ? <Pressable style={styles.link} onPress={() => void run(async () => requestCustomerCode(step === "registerOtp" ? "register" : "reset", phone))}><Text style={{ color: theme.brand }}>Gửi lại OTP</Text></Pressable> : null}
      {!staffMode && step !== "phone" ? <Pressable style={styles.link} onPress={() => { setStep("phone"); setError(null); setCode(""); setPassword(""); }}><Text style={{ color: theme.brand }}>Đổi số điện thoại</Text></Pressable> : null}
      {!staffMode ? <Pressable style={styles.link} onPress={() => { selectRole("customer"); router.replace("/(customer)/home"); }}><Text style={{ color: theme.brand }}>Tôi muốn khám phá thêm</Text></Pressable> : null}
      {(!staffMode || staffHelp) && <Pressable style={styles.link} onPress={() => { setStaffMode(!staffMode); setStaffHelp(false); setError(null); }}><Text style={{ color: theme.textMuted }}>{staffMode ? "Quay lại phần khách hàng" : "Tôi là nhân sự 30Shine"}</Text></Pressable>}
    </KeyboardAwareScrollView>
  </SafeAreaView>;
}

function PasswordField({ label, placeholder, value, onChangeText, visible, onToggle, numeric = false }: {
  label: string; placeholder: string; value: string; onChangeText: (value: string) => void;
  visible: boolean; onToggle: () => void; numeric?: boolean;
}) {
  const theme = useAppTheme();
  return <View style={[styles.passwordField, { borderColor: theme.border }]}>
    <TextInput style={[styles.passwordInput, { color: theme.text }]} accessibilityLabel={label}
      placeholder={placeholder} keyboardType={numeric ? "number-pad" : "default"}
      maxLength={numeric ? 6 : undefined} secureTextEntry={!visible} value={value}
      onChangeText={onChangeText} autoCapitalize="none" />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
      accessibilityState={{ selected: visible }} hitSlop={8} style={styles.eyeButton} onPress={onToggle}>
      <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={theme.textMuted} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 16 },
  brand: { fontSize: 18, fontWeight: "900", letterSpacing: 2 }, title: { fontSize: 28, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 52, fontSize: 16 },
  primary: { borderRadius: 12, minHeight: 52, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  passwordField: { borderWidth: 1, borderRadius: 12, height: 52, flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1, height: "100%", paddingLeft: 16, fontSize: 16 },
  eyeButton: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  staffLinks: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  staffLink: { minHeight: 44, justifyContent: "center" },
  staffLinkRight: { alignItems: "flex-end" },
  link: { alignItems: "center", justifyContent: "center", minHeight: 40, paddingVertical: 8 },
  modeLink: { borderTopWidth: 1, marginTop: 10, paddingTop: 18, minHeight: 54 },
  error: { color: "#c62828" },
  helpIntro: { fontSize: 14, lineHeight: 21 },
  helpBody: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  helpEmail: { fontSize: 14, fontWeight: "700" },
  helpNote: { fontSize: 13, lineHeight: 19 },
});
