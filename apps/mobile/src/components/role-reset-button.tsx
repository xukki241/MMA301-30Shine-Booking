import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";
import { useRole } from "@/providers/role-provider";

export function RoleResetButton() {
  const theme = useAppTheme();
  const { clearRole } = useRole();
  const { logout } = useAuth();

  function resetRole() {
    logout();
    clearRole();
    router.replace("/");
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Đổi vai trò"
      onPress={resetRole}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.surfaceHighlight,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1
        }
      ]}
    >
      <Ionicons
        name="swap-horizontal"
        size={13}
        color={theme.brand}
        style={styles.icon}
      />
      <Text style={[styles.label, { color: theme.brand }]}>Đổi vai trò</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 14
  },
  icon: {
    marginRight: 4
  },
  label: {
    fontSize: 12,
    fontWeight: "700"
  }
});
