import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.brandMark, { backgroundColor: theme.brand }]}>
          <Text style={styles.brandMarkText}>30</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>30Shine Booking</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Đăng nhập hệ thống để đặt lịch, phục vụ và quản lý lịch hẹn.
        </Text>

        <Card>
          <CardTitle>Đăng nhập tài khoản</CardTitle>
          <CardText>Nhập email và mật khẩu của bạn để tiếp tục.</CardText>

          <TextInput
            accessibilityLabel="Email đăng nhập"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email (vd: customer@30shine.vn)"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Mật khẩu đăng nhập"
            autoComplete="current-password"
            placeholder="Mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.buttonGroup}>
            <WizardAction
              label="Đăng nhập"
              onPress={() => { void handleLogin(); }}
              loading={loading}
            />
          </View>
        </Card>

        {/* Quick demo account presets */}
        <View style={styles.presets}>
          <Text style={[styles.presetTitle, { color: theme.textMuted }]}>
            Tài khoản mẫu thử nghiệm nhanh:
          </Text>
          <View style={styles.presetButtons}>
            <Pressable
              accessibilityRole="button"
              style={[styles.presetBadge, { borderColor: theme.brand }]}
              onPress={() => {
                setEmail("customer@30shine.vn");
                setPassword("Password123!");
                void handleLogin("customer@30shine.vn", "Password123!");
              }}
            >
              <Text style={[styles.presetBadgeText, { color: theme.brand }]}>
                ✂️ Customer (Khách)
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={[styles.presetBadge, { borderColor: theme.brand }]}
              onPress={() => {
                setEmail("stylist@30shine.vn");
                setPassword("Password123!");
                void handleLogin("stylist@30shine.vn", "Password123!");
              }}
            >
              <Text style={[styles.presetBadgeText, { color: theme.brand }]}>
                💈 Stylist (Thợ)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Local offline demo mode */}
        <View style={[styles.demoCard, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.demoCardText, { color: theme.textMuted }]}>
            Chưa có kết nối mạng? Trải nghiệm giao diện demo ngoại tuyến:
          </Text>
          <View style={styles.demoActions}>
            <Pressable onPress={() => enterDemo("customer")}>
              <Text style={[styles.demoLink, { color: theme.brand }]}>Demo Khách hàng ›</Text>
            </Pressable>
            <Pressable onPress={() => enterDemo("stylist")}>
              <Text style={[styles.demoLink, { color: theme.brand }]}>Demo Stylist ›</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22,
  },
  brandMark: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    marginTop: 18,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  buttonGroup: {
    marginTop: 14,
  },
  errorBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
  },
  presets: {
    marginTop: 20,
    gap: 8,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  presetButtons: {
    flexDirection: "row",
    gap: 10,
  },
  presetBadge: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  presetBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  demoCard: {
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    gap: 8,
  },
  demoCardText: {
    fontSize: 13,
    lineHeight: 18,
  },
  demoActions: {
    flexDirection: "row",
    gap: 20,
    marginTop: 4,
  },
  demoLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
