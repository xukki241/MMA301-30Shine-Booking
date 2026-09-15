import { Redirect, Tabs } from "expo-router";

import { RoleResetButton } from "@/components/role-reset-button";
import { useAppTheme } from "@/constants/theme";
import { useRole } from "@/providers/role-provider";

export default function StylistLayout() {
  const theme = useAppTheme();
  const { role } = useRole();

  if (role !== "stylist") {
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
        name="today"
        options={{ title: "Stylist", tabBarLabel: "Hôm nay" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Hồ sơ Stylist", tabBarLabel: "Hồ sơ" }}
      />
    </Tabs>
  );
}
