import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

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
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Text style={[styles.label, { color: theme.brand }]}>Đổi vai trò</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  label: {
    fontSize: 14,
    fontWeight: "700"
  }
});
