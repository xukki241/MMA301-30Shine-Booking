import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-provider";
import { useAppTheme } from "@/constants/theme";
import { profileDestination, addressDestination } from "@/customer/profile-navigation";

export default function CustomerAccountScreen() {
  const theme = useAppTheme();
  const { token, user, logout } = useAuth();
  const openProfile = () => router.push(profileDestination(Boolean(token)));
  const rows: Array<{ title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }> = [
    { title: "Thông tin tài khoản", icon: "person-circle-outline", onPress: openProfile },
    { title: "Địa chỉ nhà", icon: "home-outline", onPress: () => router.push(addressDestination(Boolean(token))) },
    { title: "Lịch sử cắt", icon: "time-outline", onPress: () => router.push("/(customer)/appointments") },
  ];
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: theme.text }]}>Tài khoản</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Thông tin tài khoản" onPress={openProfile}
        style={[styles.summary, { backgroundColor: theme.brand }]}>
        <View style={styles.avatar}><Ionicons name="person" size={30} color={theme.brand} /></View>
        <View style={{ flex: 1 }}><Text style={styles.name}>{user?.name || "GUEST"}</Text>
          <Text style={styles.subtitle}>{token ? user?.phone : "Đăng nhập để quản lý hồ sơ"}</Text></View>
        <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
      </Pressable>
      <View style={[styles.rows, { backgroundColor: theme.surface }]}>
        {rows.map((row) => <Pressable key={row.title} accessibilityRole="button" onPress={row.onPress}
          style={[styles.row, { borderBottomColor: theme.border }]}>
          <Ionicons name={row.icon} size={23} color={theme.brand} />
          <Text style={[styles.rowText, { color: theme.text }]}>{row.title}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>)}
      </View>
      {token ? <Pressable accessibilityRole="button" style={styles.action} onPress={() => { logout(); router.replace("/(customer)/account"); }}>
        <Text style={{ color: theme.brand, fontWeight: "800" }}>Đăng xuất</Text>
      </Pressable> : <Pressable accessibilityRole="button" style={[styles.login, { backgroundColor: theme.brand }]}
        onPress={() => router.push("/login?next=profile")}><Text style={styles.loginText}>Đăng nhập / Đăng ký</Text></Pressable>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 20, gap: 18 }, heading: { fontSize: 25, fontWeight: "800" },
  summary: { borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  name: { color: "#FFFFFF", fontSize: 19, fontWeight: "800" }, subtitle: { color: "#E3EBF9", marginTop: 4 },
  rows: { borderRadius: 16, overflow: "hidden" }, row: { minHeight: 64, paddingHorizontal: 18, flexDirection: "row",
    alignItems: "center", gap: 15, borderBottomWidth: 1 }, rowText: { fontSize: 16, fontWeight: "600", flex: 1 },
  action: { alignSelf: "center", padding: 14 }, login: { borderRadius: 12, padding: 16, alignItems: "center" },
  loginText: { color: "#FFFFFF", fontWeight: "800" },
});
