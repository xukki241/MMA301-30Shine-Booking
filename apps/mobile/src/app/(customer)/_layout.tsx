import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";

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
              color={color}
            />
          )
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          headerShown: false,
          tabBarLabel: "Đặt lịch",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.centerTabButton, { backgroundColor: theme.brand }]}>
              <Ionicons
                name="calendar"
                size={22}
                color="#FFFFFF"
              />
            </View>
          ),
          tabBarLabelStyle: [styles.tabBarLabel, { fontWeight: "800", color: theme.brand }]
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
              color={color}
            />
          )
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerTabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#1B2A4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700"
  }
});
