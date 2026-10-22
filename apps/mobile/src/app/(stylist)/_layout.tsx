import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";

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
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border,
          height: Platform.OS === "ios" ? 78 : 68, paddingBottom: Platform.OS === "ios" ? 22 : 10,
          paddingTop: 8, elevation: 8 }
      }}
    >
      <Tabs.Screen
        name="today"
        options={{ title: "Lịch làm việc", tabBarLabel: "Lịch hẹn", tabBarIcon: ({ color, focused }) =>
          <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Hồ sơ Stylist", tabBarLabel: "Hồ sơ", tabBarIcon: ({ color, focused }) =>
          <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({ tabLabel: { fontSize: 11, fontWeight: "700" } });
