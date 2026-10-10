import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Card, CardText, CardTitle } from "@/components/screen";
import { WizardAction } from "@/components/booking-wizard";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";
import { useRole, type MobileRole } from "@/providers/role-provider";

export default function LoginScreen() {
  const theme = useAppTheme();
  const { user, token, role, login } = useAuth();
  const { selectRole } = useRole();

  const [email, setEmail] = useState("customer@30shine.vn");
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (token && role) {
      selectRole(role);
      router.replace(role === "customer" ? "/(customer)/home" : "/(stylist)/today");
    }
  }, [token, role, selectRole]);

  async function handleLogin(customEmail?: string, customPassword?: string) {
    const targetEmail = customEmail || email;
    const targetPassword = customPassword || password;
    setLoading(true);
    setErrorMessage(null);
    try {
      const loggedUser = await login(targetEmail, targetPassword);
      const targetRole: MobileRole = loggedUser.role === "stylist" ? "stylist" : "customer";
      selectRole(targetRole);
      router.replace(targetRole === "customer" ? "/(customer)/home" : "/(stylist)/today");
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  function enterDemo(demoRole: MobileRole) {
    selectRole(demoRole);
    router.replace(demoRole === "customer" ? "/(customer)/home" : "/(stylist)/today");
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Brand */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={[styles.brandMark, { backgroundColor: theme.brand }]}>
                <Text style={styles.brandMarkText}>30</Text>
              </View>
              <View>
                <Text style={[styles.brandBadge, { color: theme.gold }]}>30SHINE SALON</Text>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Đăng nhập</Text>
              </View>
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
              Đăng nhập tài khoản để đặt lịch, phục vụ ca làm việc và trải nghiệm dịch vụ tiện ích.
            </Text>
          </View>

          {/* Login Card */}
          <Card style={styles.formCard}>
            <CardTitle>Tài khoản & Mật khẩu</CardTitle>
            <CardText>Nhập email và mật khẩu của bạn để tiếp tục:</CardText>

            {/* Email Field */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Email tài khoản</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.surfaceHighlight,
                    borderColor: focusedField === "email" ? theme.brand : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focusedField === "email" ? theme.brand : theme.textMuted}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  accessibilityLabel="Email đăng nhập"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="nhap.email@example.com"
                  placeholderTextColor={theme.textDim}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Mật khẩu</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.surfaceHighlight,
                    borderColor: focusedField === "password" ? theme.brand : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === "password" ? theme.brand : theme.textMuted}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  accessibilityLabel="Mật khẩu đăng nhập"
                  autoComplete="current-password"
                  placeholder="Mật khẩu"
                  placeholderTextColor={theme.textDim}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={[styles.input, { color: theme.text }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={8}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: theme.isDark ? "rgba(220, 38, 38, 0.18)" : "#FEE2E2",
                    borderColor: theme.danger,
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={theme.danger}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Submit Action */}
            <View style={styles.actionSection}>
              <WizardAction
                label="Đăng nhập"
                onPress={() => { void handleLogin(); }}
                loading={loading}
              />
            </View>
          </Card>

          {/* Link to register screen */}
          <View style={styles.registerRedirect}>
            <Text style={[styles.redirectText, { color: theme.textMuted }]}>
              Chưa có tài khoản 30Shine?{" "}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chuyển sang đăng ký ngay"
              onPress={() => router.push("/register")}
              hitSlop={8}
            >
              <Text style={[styles.redirectLink, { color: theme.brand }]}>
                Đăng ký ngay
              </Text>
            </Pressable>
          </View>

          {/* Quick demo account presets */}
          <View style={styles.presetsSection}>
            <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
              TÀI KHOẢN MẪU THỬ NGHIỆM
            </Text>
            <View style={styles.presetGrid}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đăng nhập nhanh tài khoản Khách hàng"
                style={({ pressed }) => [
                  styles.presetCard,
                  {
                    backgroundColor: theme.surfaceHighlight,
                    borderColor: theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => {
                  setEmail("customer@30shine.vn");
                  setPassword("Password123!");
                  void handleLogin("customer@30shine.vn", "Password123!");
                }}
              >
                <View style={styles.presetTop}>
                  <View style={[styles.presetIconBadge, { backgroundColor: theme.brandMuted }]}>
                    <Ionicons name="person" size={16} color={theme.brand} />
                  </View>
                  <Text style={[styles.presetRoleTag, { color: theme.brand }]}>Customer</Text>
                </View>
                <Text style={[styles.presetCardTitle, { color: theme.text }]}>Khách hàng mẫu</Text>
                <Text style={[styles.presetEmail, { color: theme.textMuted }]}>
                  customer@30shine.vn
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đăng nhập nhanh tài khoản Stylist"
                style={({ pressed }) => [
                  styles.presetCard,
                  {
                    backgroundColor: theme.surfaceHighlight,
                    borderColor: theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => {
                  setEmail("stylist@30shine.vn");
                  setPassword("Password123!");
                  void handleLogin("stylist@30shine.vn", "Password123!");
                }}
              >
                <View style={styles.presetTop}>
                  <View style={[styles.presetIconBadge, { backgroundColor: theme.goldMuted }]}>
                    <Ionicons name="cut" size={16} color={theme.gold} />
                  </View>
                  <Text style={[styles.presetRoleTag, { color: theme.gold }]}>Stylist</Text>
                </View>
                <Text style={[styles.presetCardTitle, { color: theme.text }]}>Stylist mẫu</Text>
                <Text style={[styles.presetEmail, { color: theme.textMuted }]}>
                  stylist@30shine.vn
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Local offline demo mode */}
          <View style={[styles.demoCard, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}>
            <View style={styles.demoCardHeader}>
              <Ionicons name="cloud-offline-outline" size={16} color={theme.textMuted} />
              <Text style={[styles.demoCardTitle, { color: theme.text }]}>
                Chế độ xem trước ngoại tuyến (Offline Demo)
              </Text>
            </View>
            <Text style={[styles.demoCardDesc, { color: theme.textMuted }]}>
              Trải nghiệm nhanh luồng giao diện mẫu mà không cần kết nối máy chủ backend:
            </Text>
            <View style={styles.demoActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mở demo Khách hàng"
                style={[styles.demoButton, { borderColor: theme.border }]}
                onPress={() => enterDemo("customer")}
              >
                <Text style={[styles.demoButtonText, { color: theme.brand }]}>Demo Khách hàng ›</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mở demo Stylist"
                style={[styles.demoButton, { borderColor: theme.border }]}
                onPress={() => enterDemo("stylist")}
              >
                <Text style={[styles.demoButtonText, { color: theme.brand }]}>Demo Stylist ›</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandMark: {
    alignItems: "center",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  brandBadge: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  formCard: {
    padding: 18,
    gap: 12,
  },
  fieldBlock: {
    marginTop: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  inputLeadingIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 6,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  actionSection: {
    marginTop: 10,
  },
  registerRedirect: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 4,
  },
  redirectText: {
    fontSize: 14,
  },
  redirectLink: {
    fontSize: 14,
    fontWeight: "800",
  },
  presetsSection: {
    marginTop: 24,
    gap: 10,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  presetGrid: {
    flexDirection: "row",
    gap: 10,
  },
  presetCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  presetTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  presetIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  presetRoleTag: {
    fontSize: 11,
    fontWeight: "800",
  },
  presetCardTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  presetEmail: {
    fontSize: 11,
  },
  demoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 20,
    gap: 8,
  },
  demoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  demoCardTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  demoCardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  demoActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  demoButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  demoButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

