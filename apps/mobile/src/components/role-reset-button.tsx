import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { useAppTheme } from "@/constants/theme";
import { useRole } from "@/providers/role-provider";

export function RoleResetButton() {
  const theme = useAppTheme();
  const { clearRole } = useRole();

  function resetRole() {
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
