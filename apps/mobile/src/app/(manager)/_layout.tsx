import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { RoleResetButton } from "@/components/role-reset-button";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";
import { useRole } from "@/providers/role-provider";

export default function ManagerLayout() {
  const theme = useAppTheme();
  const auth = useAuth();
  const { role } = useRole();
  if (!auth.hydrated) return null;
  if (auth.role !== "general_manager" || role !== "general_manager") return <Redirect href="/login" />;
  return <Tabs screenOptions={{ headerRight: () => <RoleResetButton />,
    headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text,
    tabBarActiveTintColor: theme.brand, tabBarInactiveTintColor: theme.textMuted,
    tabBarLabelStyle: styles.tabLabel,
    tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border,
      height: Platform.OS === "ios" ? 78 : 68, paddingBottom: Platform.OS === "ios" ? 22 : 10,
      paddingTop: 8, elevation: 8 } }}>
    <Tabs.Screen name="overview" options={{ title: "Tổng quan", tabBarIcon: ({ color, focused }) =>
      <Ionicons name={focused ? "grid" : "grid-outline"} size={21} color={typeof color === "number" || color == null ? theme.brand : color} /> }} />
    <Tabs.Screen name="appointments" options={{ title: "Lịch đặt", tabBarIcon: ({ color, focused }) =>
      <Ionicons name={focused ? "calendar" : "calendar-outline"} size={21} color={typeof color === "number" || color == null ? theme.brand : color} /> }} />
    <Tabs.Screen name="operations" options={{ title: "Vận hành", tabBarIcon: ({ color, focused }) =>
      <Ionicons name={focused ? "construct" : "construct-outline"} size={21} color={typeof color === "number" || color == null ? theme.brand : color} /> }} />
    <Tabs.Screen name="payments" options={{ title: "Thanh toán", tabBarIcon: ({ color, focused }) =>
      <Ionicons name={focused ? "wallet" : "wallet-outline"} size={21} color={typeof color === "number" || color == null ? theme.brand : color} /> }} />
    <Tabs.Screen name="appointment-detail" options={{ title: "Chi tiết lịch", href: null }} />
  </Tabs>;
}

const styles = StyleSheet.create({ tabLabel: { fontSize: 10, fontWeight: "700" } });
