import { router } from "expo-router";
import { useState } from "react";
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

export default function RegisterScreen() {
  const theme = useAppTheme();
  const { register } = useAuth();
  const { selectRole } = useRole();

  const [role, setRole] = useState<MobileRole>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRegister() {
    setErrorMessage(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage("Vui lòng nhập địa chỉ email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Địa chỉ email không đúng định dạng.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Mật khẩu phải chứa ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setLoading(true);
    try {
      const user = await register(trimmedEmail, password, role);
      const targetRole: MobileRole = user.role === "stylist" ? "stylist" : "customer";
      selectRole(targetRole);
      router.replace(targetRole === "customer" ? "/(customer)/home" : "/(stylist)/today");
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
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
                <Text style={[styles.headerTitle, { color: theme.text }]}>Đăng ký tài khoản</Text>
              </View>
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
              Trải nghiệm đặt lịch nhanh chóng, chọn stylist ưu thích và quản lý lịch cắt tiện lợi.
            </Text>
          </View>

          {/* Registration Card */}
          <Card style={styles.formCard}>
            <CardTitle>Chọn loại tài khoản</CardTitle>
            <CardText>Chọn đúng vai trò sử dụng của bạn trên ứng dụng di động:</CardText>

            {/* Role Selector Grid */}
            <View style={styles.roleGrid}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: role === "customer" }}
                accessibilityLabel="Khách hàng - Đặt lịch làm tóc và nhận ưu đãi"
                onPress={() => setRole("customer")}
                style={({ pressed }) => [
                  styles.roleCard,
                  {
                    backgroundColor:
                      role === "customer"
                        ? theme.isDark
                          ? "rgba(225, 29, 46, 0.15)"
                          : "rgba(225, 29, 46, 0.08)"
                        : theme.surfaceHighlight,
                    borderColor: role === "customer" ? theme.brand : theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.roleCardHeader}>
                  <View
                    style={[
                      styles.roleIconCircle,
                      {
                        backgroundColor:
                          role === "customer"
                            ? theme.brand
                            : theme.isDark
                              ? "#1E293B"
                              : "#E2E8F0",
                      },
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={18}
                      color={role === "customer" ? "#FFFFFF" : theme.textMuted}
                    />
                  </View>
                  <Ionicons
                    name={role === "customer" ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={role === "customer" ? theme.brand : theme.textDim}
                  />
                </View>
                <Text
                  style={[
                    styles.roleTitle,
                    { color: role === "customer" ? theme.brand : theme.text },
                  ]}
                >
                  Khách hàng
                </Text>
                <Text style={[styles.roleDesc, { color: theme.textMuted }]}>
                  Đặt lịch & chăm sóc tóc
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: role === "stylist" }}
                accessibilityLabel="Stylist - Thợ cắt tóc, xem lịch làm việc hôm nay"
                onPress={() => setRole("stylist")}
                style={({ pressed }) => [
                  styles.roleCard,
                  {
                    backgroundColor:
                      role === "stylist"
                        ? theme.isDark
                          ? "rgba(245, 158, 11, 0.15)"
                          : "rgba(245, 158, 11, 0.08)"
                        : theme.surfaceHighlight,
                    borderColor: role === "stylist" ? theme.gold : theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.roleCardHeader}>
                  <View
                    style={[
                      styles.roleIconCircle,
                      {
                        backgroundColor:
                          role === "stylist"
                            ? theme.gold
                            : theme.isDark
                              ? "#1E293B"
                              : "#E2E8F0",
                      },
                    ]}
                  >
                    <Ionicons
                      name="cut"
                      size={18}
                      color={role === "stylist" ? "#FFFFFF" : theme.textMuted}
                    />
                  </View>
                  <Ionicons
                    name={role === "stylist" ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={role === "stylist" ? theme.gold : theme.textDim}
                  />
                </View>
                <Text
                  style={[
                    styles.roleTitle,
                    { color: role === "stylist" ? theme.gold : theme.text },
                  ]}
                >
                  Stylist (Thợ cắt)
                </Text>
                <Text style={[styles.roleDesc, { color: theme.textMuted }]}>
                  Xem ca & hoàn thành lịch
                </Text>
              </Pressable>
            </View>

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
                  accessibilityLabel="Email đăng ký"
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
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Mật khẩu</Text>
                <Text style={[styles.fieldHint, { color: theme.textMuted }]}>Tối thiểu 8 ký tự</Text>
              </View>
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
                  accessibilityLabel="Mật khẩu đăng ký"
                  autoComplete="new-password"
                  placeholder="Nhập mật khẩu"
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

            {/* Confirm Password Field */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Xác nhận mật khẩu</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.surfaceHighlight,
                    borderColor: focusedField === "confirmPassword" ? theme.brand : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={focusedField === "confirmPassword" ? theme.brand : theme.textMuted}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  accessibilityLabel="Xác nhận mật khẩu"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={theme.textDim}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  style={[styles.input, { color: theme.text }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  hitSlop={8}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            {/* Error Message Banner */}
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
                label="Tạo tài khoản ngay"
                onPress={() => { void handleRegister(); }}
                loading={loading}
              />
            </View>
          </Card>

          {/* Switch to Login redirect */}
          <View style={styles.loginRedirect}>
            <Text style={[styles.redirectText, { color: theme.textMuted }]}>
              Đã có tài khoản 30Shine?{" "}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đăng nhập ngay"
              onPress={() => router.replace("/login")}
              hitSlop={8}
            >
              <Text style={[styles.redirectLink, { color: theme.brand }]}>
                Đăng nhập
              </Text>
            </Pressable>
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
  roleGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  roleCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    minHeight: 110,
    justifyContent: "space-between",
  },
  roleCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  roleDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  fieldBlock: {
    marginTop: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 11,
    fontWeight: "500",
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
  loginRedirect: {
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
});

