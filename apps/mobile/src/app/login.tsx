import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";
import { useRole } from "@/providers/role-provider";
import { staffLanding } from "@/providers/auth-utils";

export default function EntryScreen() {
  const theme = useAppTheme();
  const { token, role, hydrated, enterCustomer, login } = useAuth();
  const { selectRole } = useRole();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [staffMode, setStaffMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && token && role) {
      selectRole(role);
      router.replace(role === "customer" ? "/(customer)/home" : staffLanding(role));
    }
  }, [hydrated, token, role, selectRole]);

  async function continueCustomer() {
    setBusy(true);
    setError(null);
    try {
      await enterCustomer(name, phone);
      selectRole("customer");
      router.replace("/(customer)/home");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể vào ứng dụng.");
    } finally { setBusy(false); }
  }

  async function continueStaff() {
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      if (user.role !== "stylist" && user.role !== "general_manager") throw new Error("Tài khoản không được dùng app nhân sự.");
      selectRole(user.role);
      router.replace(staffLanding(user.role));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Đăng nhập thất bại.");
    } finally { setBusy(false); }
  }

  if (!hydrated) return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}><ActivityIndicator /></SafeAreaView>;
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color: theme.brand }]}>30SHINE BOOKING</Text>
        <Text style={[styles.title, { color: theme.text }]}>{staffMode ? "Đăng nhập nhân sự" : "Đặt lịch nhanh"}</Text>
        <Text style={[styles.description, { color: theme.textMuted }]}>
          {staffMode ? "Nhập tài khoản nhân sự để xem ca và lịch hẹn." : "Chỉ cần tên và số điện thoại để bắt đầu. Không cần tạo mật khẩu."}
        </Text>

        {staffMode ? <>
          <TextInput accessibilityLabel="Email nhân sự" autoCapitalize="none" keyboardType="email-address"
            placeholder="Email nhân sự" value={email} onChangeText={setEmail} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
          <TextInput accessibilityLabel="Mật khẩu nhân sự" placeholder="Mật khẩu" secureTextEntry
            value={password} onChangeText={setPassword} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
        </> : <>
          <TextInput accessibilityLabel="Tên khách hàng" autoComplete="name" placeholder="Họ và tên"
            value={name} onChangeText={setName} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
          <TextInput accessibilityLabel="Số điện thoại khách hàng" autoComplete="tel" keyboardType="phone-pad"
            placeholder="Số điện thoại" value={phone} onChangeText={setPhone} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
        </>}
        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void (staffMode ? continueStaff() : continueCustomer()); }}
          style={[styles.button, { backgroundColor: theme.brand, opacity: busy ? 0.6 : 1 }]}>
          <Text style={styles.buttonText}>{busy ? "Đang xử lý..." : staffMode ? "Đăng nhập" : "Bắt đầu sử dụng"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setStaffMode((current) => !current); setError(null); }} style={styles.switch}>
          <Text style={{ color: theme.brand }}>{staffMode ? "Quay lại phần khách hàng" : "Tôi là nhân sự"}</Text>
        </Pressable>
        {!staffMode ? <Text style={[styles.note, { color: theme.textMuted }]}>
          Lịch trên thiết bị cũ chỉ hiện sau khi khôi phục bằng OTP demo. OTP không gửi SMS.
        </Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center" },
  content: { padding: 28, gap: 14 },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  title: { fontSize: 34, fontWeight: "800" },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 16 },
  button: { borderRadius: 12, alignItems: "center", justifyContent: "center", height: 52, marginTop: 5 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  switch: { alignItems: "center", padding: 10 },
  note: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  error: { fontSize: 13 },
});
