import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-provider";
import { useRole } from "@/providers/role-provider";
import { staffLanding } from "@/providers/auth-utils";
import { useAppTheme } from "@/constants/theme";

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
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && token && role) {
      selectRole(role);
      router.replace(role === "customer" ? (next === "book" ? "/(customer)/book" : "/(customer)/home") : staffLanding(role));
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
      router.replace(next === "book" ? "/(customer)/book" : "/(customer)/home");
    } else if (step === "registerOtp" || step === "resetOtp") {
      await verifyCustomerCode(step === "registerOtp" ? "register" : "reset", phone, code);
      setStep(step === "registerOtp" ? "registerDetails" : "resetPassword");
    } else if (step === "registerDetails") {
      await completeCustomerRegistration(phone, code, password, name); selectRole("customer");
      router.replace(next === "book" ? "/(customer)/book" : "/(customer)/home");
    } else {
      await resetCustomerPassword(phone, code, password); selectRole("customer");
      router.replace(next === "book" ? "/(customer)/book" : "/(customer)/home");
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
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.brand, { color: theme.brand }]}>30SHINE MEMBER</Text>
      <Text style={[styles.title, { color: theme.text }]}>{staffMode ? "Đăng nhập nhân sự" : labels[step][0]}</Text>
      {!staffMode && step === "phone" ? <Text style={{ color: theme.textMuted }}>Nhập số điện thoại để đăng nhập hoặc đăng ký. Bạn cũng có thể khám phá ứng dụng trước.</Text> : null}
      {staffMode ? <>
        <TextInput style={inputStyle} accessibilityLabel="Email nhân sự" placeholder="Email nhân sự" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={inputStyle} accessibilityLabel="Mật khẩu nhân sự" placeholder="Mật khẩu" secureTextEntry value={staffPassword} onChangeText={setStaffPassword} />
      </> : <>
        <TextInput style={inputStyle} accessibilityLabel="Số điện thoại khách hàng" placeholder="Số điện thoại Việt Nam" keyboardType="phone-pad" value={phone} onChangeText={setPhone} editable={step === "phone"} />
        {step === "registerOtp" || step === "resetOtp" ? <TextInput style={inputStyle} accessibilityLabel="Mã OTP" placeholder="Mã OTP 6 số trong log Auth Service" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} /> : null}
        {step === "registerDetails" ? <TextInput style={inputStyle} accessibilityLabel="Tên khách hàng" placeholder="Họ và tên" value={name} onChangeText={setName} /> : null}
        {step === "login" || step === "registerDetails" || step === "resetPassword" ? <TextInput style={inputStyle} accessibilityLabel="Mật khẩu khách hàng" placeholder="Mật khẩu gồm 6 chữ số" keyboardType="number-pad" maxLength={6} secureTextEntry value={password} onChangeText={setPassword} /> : null}
      </>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={busy} style={[styles.primary, { backgroundColor: theme.brand }]} onPress={() => void run(staffMode ? submitStaff : submitCustomer)}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{staffMode ? "Đăng nhập nhân sự" : labels[step][1]}</Text>}
      </Pressable>
      {!staffMode && step === "login" ? <Pressable style={styles.link} onPress={() => void run(async () => { await requestCustomerCode("reset", phone); setCode(""); setPassword(""); setStep("resetOtp"); })}><Text style={{ color: theme.brand }}>Quên mật khẩu?</Text></Pressable> : null}
      {!staffMode && (step === "registerOtp" || step === "resetOtp") ? <Pressable style={styles.link} onPress={() => void run(async () => requestCustomerCode(step === "registerOtp" ? "register" : "reset", phone))}><Text style={{ color: theme.brand }}>Gửi lại OTP</Text></Pressable> : null}
      {!staffMode && step !== "phone" ? <Pressable style={styles.link} onPress={() => { setStep("phone"); setError(null); setCode(""); setPassword(""); }}><Text style={{ color: theme.brand }}>Đổi số điện thoại</Text></Pressable> : null}
      {!staffMode ? <Pressable style={styles.link} onPress={() => { selectRole("customer"); router.replace("/(customer)/home"); }}><Text style={{ color: theme.brand }}>Tôi muốn khám phá thêm</Text></Pressable> : null}
      <Pressable style={styles.link} onPress={() => { setStaffMode(!staffMode); setError(null); }}><Text style={{ color: theme.textMuted }}>{staffMode ? "Quay lại phần khách hàng" : "Tôi là nhân sự 30Shine"}</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 16 },
  brand: { fontSize: 18, fontWeight: "900", letterSpacing: 2 }, title: { fontSize: 28, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 52, fontSize: 16 },
  primary: { borderRadius: 12, minHeight: 52, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" }, link: { alignItems: "center", padding: 8 },
  error: { color: "#c62828" },
});
