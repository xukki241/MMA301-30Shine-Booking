import { Redirect, Tabs } from "expo-router";

import { RoleResetButton } from "@/components/role-reset-button";
import { useAppTheme } from "@/constants/theme";
import { useRole } from "@/providers/role-provider";

export default function CustomerLayout() {
  const theme = useAppTheme();
  const { role } = useRole();

  if (role !== "customer") {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <RoleResetButton />,
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: "800" },
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Customer", tabBarLabel: "Trang chủ" }}
      />
      <Tabs.Screen
        name="book"
        options={{ title: "Đặt lịch", href: null }}
      />
      <Tabs.Screen
        name="appointments"
        options={{ title: "Lịch hẹn", tabBarLabel: "Lịch hẹn" }}
      />
    </Tabs>
  );
}
