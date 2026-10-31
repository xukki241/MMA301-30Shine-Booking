import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";

import { RoleResetButton } from "@/components/role-reset-button";
import { useAppTheme } from "@/constants/theme";
import { useRole } from "@/providers/role-provider";

export default function CustomerLayout() {
  const theme = useAppTheme();
  const { role } = useRole();

  if (role !== "customer") {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <RoleResetButton />,
        headerStyle: {
          backgroundColor: theme.brand,
          shadowColor: "transparent",
          elevation: 0
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "800", fontSize: 17 },
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: Platform.OS === "ios" ? 78 : 68,
          paddingBottom: Platform.OS === "ios" ? 22 : 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarLabel: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={typeof color === "number" || color == null ? theme.brand : color}
            />
          )
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          headerShown: false,
          tabBarLabel: "Đặt lịch",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={22}
              color={typeof color === "number" || color == null ? theme.brand : color}
            />
          )
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          headerShown: false,
          tabBarLabel: "Lịch sử cắt",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={22}
              color={typeof color === "number" || color == null ? theme.brand : color}
            />
          )
        }}
      />
      <Tabs.Screen name="account" options={{ title: "Tài khoản", tabBarLabel: "Tài khoản",
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={22} color={typeof color === "number" || color == null ? theme.brand : color} /> }} />
      <Tabs.Screen name="profile" options={{ href: null, headerShown: false, tabBarStyle: { display: "none" } }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700"
  }
});
