import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

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
        headerStyle: {
          backgroundColor: theme.surface,
          shadowColor: "transparent",
          elevation: 0
        },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: "800" },
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          headerTitle: () => (
            <View style={styles.brandContainer}>
              <View style={[styles.brandBadge, { backgroundColor: theme.brand }]}>
                <Text style={styles.brandBadgeText}>30</Text>
              </View>
              <Text style={[styles.brandText, { color: theme.text }]}>30Shine</Text>
            </View>
          ),
          tabBarLabel: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "cut" : "cut-outline"}
              size={21}
              color={color}
            />
          )
        }}
      />
      <Tabs.Screen
        name="book"
        options={{ title: "Đặt lịch", href: null }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Lịch hẹn của tôi",
          tabBarLabel: "Lịch hẹn",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={21}
              color={color}
            />
          )
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  brandContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  brandBadge: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 8
  },
  brandBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  brandText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700"
  }
});
