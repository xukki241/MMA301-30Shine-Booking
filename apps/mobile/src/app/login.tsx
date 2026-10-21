import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
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
    } finally {
      setBusy(false);
    }
  }

  async function continueStaff() {
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      if (user.role !== "stylist" && user.role !== "general_manager") {
        throw new Error("Tài khoản không được dùng app nhân sự.");
      }
      selectRole(user.role);
      router.replace(staffLanding(user.role));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Đăng nhập thất bại.");
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.brand} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* 1. Deep Navy Top Brand Header */}
      <View style={[styles.navyHeader, { backgroundColor: theme.brand }]}>
        <SafeAreaView edges={["top"]} style={styles.safeHeader}>
          <View style={styles.headerRow}>
            <View style={styles.brandBadge}>
              <Ionicons name="cut" size={16} color={theme.brand} />
            </View>
            <Text style={styles.brandTitle}>30SHINE MEMBER</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Hệ thống chuỗi cắt tóc hàng đầu Việt Nam
          </Text>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {staffMode ? "Đăng nhập nhân sự" : "Chào mừng đến 30Shine"}
            </Text>
            <Text style={[styles.cardDesc, { color: theme.textMuted }]}>
              {staffMode
                ? "Nhập tài khoản nhân sự (Stylist hoặc Manager) để truy cập hệ thống."
                : "Chỉ cần tên và số điện thoại để đặt lịch và tích điểm. Không cần mật khẩu."}
            </Text>
          </View>

          {/* Form Fields */}
          {staffMode ? (
            <View style={styles.formGroup}>
              <View style={[styles.inputRow, { borderColor: theme.border, backgroundColor: theme.surfaceHighlight }]}>
                <Ionicons name="mail-outline" size={18} color={theme.textMuted} />
                <TextInput
                  accessibilityLabel="Email nhân sự"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email nhân sự (@30shine.com)..."
                  placeholderTextColor={theme.textDim}
                  value={email}
                  onChangeText={setEmail}
                  style={[styles.inputField, { color: theme.text }]}
                />
              </View>

              <View style={[styles.inputRow, { borderColor: theme.border, backgroundColor: theme.surfaceHighlight }]}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />
                <TextInput
                  accessibilityLabel="Mật khẩu nhân sự"
                  placeholder="Mật khẩu..."
                  placeholderTextColor={theme.textDim}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.inputField, { color: theme.text }]}
                />
              </View>
            </View>
          ) : (
            <View style={styles.formGroup}>
              <View style={[styles.inputRow, { borderColor: theme.border, backgroundColor: theme.surfaceHighlight }]}>
                <Ionicons name="person-outline" size={18} color={theme.textMuted} />
                <TextInput
                  accessibilityLabel="Tên khách hàng"
                  autoComplete="name"
                  placeholder="Họ và tên của anh (VD: Tuấn)..."
                  placeholderTextColor={theme.textDim}
                  value={name}
                  onChangeText={setName}
                  style={[styles.inputField, { color: theme.text }]}
                />
              </View>

              <View style={[styles.inputRow, { borderColor: theme.border, backgroundColor: theme.surfaceHighlight }]}>
                <Ionicons name="call-outline" size={18} color={theme.textMuted} />
                <TextInput
                  accessibilityLabel="Số điện thoại khách hàng"
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  placeholder="Số điện thoại nhận tin đặt lịch..."
                  placeholderTextColor={theme.textDim}
                  value={phone}
                  onChangeText={setPhone}
                  style={[styles.inputField, { color: theme.text }]}
                />
              </View>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* Action Button */}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              void (staffMode ? continueStaff() : continueCustomer());
            }}
            style={[styles.submitButton, { backgroundColor: theme.brand, opacity: busy ? 0.7 : 1 }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  {staffMode ? "ĐĂNG NHẬP NHÂN SỰ" : "BẮT ĐẦU ĐẶT LỊCH NGAY"}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </>
            )}
          </Pressable>

          {/* Switch Customer / Staff Mode */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStaffMode((current) => !current);
              setError(null);
            }}
            style={styles.switchButton}
          >
            <Text style={[styles.switchButtonText, { color: "#1b2a4a"}]}>
              {staffMode ? "Quay lại phần Khách hàng" : "Tôi là nhân sự 30Shine ›"}
            </Text>
          </Pressable>

          {!staffMode ? (
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                <Text style={[styles.trustText, { color: theme.textMuted }]}>30s giữ chỗ</Text>
              </View>
              <Text style={{ color: theme.textDim }}>•</Text>
              <View style={styles.trustItem}>
                <Ionicons name="shield-checkmark" size={14} color="#3B82F6" />
                <Text style={[styles.trustText, { color: theme.textMuted }]}>Không mất phí</Text>
              </View>
              <Text style={{ color: theme.textDim }}>•</Text>
              <View style={styles.trustItem}>
                <Ionicons name="sparkles" size={14} color={theme.gold} />
                <Text style={[styles.trustText, { color: theme.textMuted }]}>Bảo hành 7 ngày</Text>
              </View>
            </View>
          ) : null}
        </View>

        {!staffMode ? (
          <Text style={[styles.demoNote, { color: theme.textDim }]}>
            * Lịch trên thiết bị cũ chỉ hiện sau khi khôi phục bằng OTP demo trong log Auth Service.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  navyHeader: {
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  safeHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 10 : 4,
    gap: 6
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 12
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },
  cardHeader: {
    gap: 4
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "900"
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18
  },
  formGroup: {
    gap: 12
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    gap: 10
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    padding: 0
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    padding: 10,
    borderRadius: 8
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    height: 48,
    gap: 8,
    marginTop: 4
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: 6
  },
  switchButtonText: {
    fontSize: 13,
    fontWeight: "800"
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 14
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  trustText: {
    fontSize: 11,
    fontWeight: "600"
  },
  demoNote: {
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 16
  }
});
