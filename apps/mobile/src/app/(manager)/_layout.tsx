import { Redirect, Tabs } from "expo-router";
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
    tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border } }}>
    <Tabs.Screen name="overview" options={{ title: "Tổng quan" }} />
    <Tabs.Screen name="appointments" options={{ title: "Lịch đặt" }} />
    <Tabs.Screen name="operations" options={{ title: "Vận hành" }} />
    <Tabs.Screen name="payments" options={{ title: "Thanh toán" }} />
  </Tabs>;
}
