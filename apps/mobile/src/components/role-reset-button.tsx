import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";
import { useRole } from "@/providers/role-provider";

export function RoleResetButton({
  variant = "surface"
}: {
  variant?: "surface" | "onBrand";
}) {
  const theme = useAppTheme();
  const { clearRole } = useRole();
  const { user, logout } = useAuth();

  async function resetRole() {
    await logout();
    clearRole();
    router.replace("/login");
  }

  function handlePress() {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc muốn đăng xuất khỏi ứng dụng?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: () => {
            void resetRole();
          }
        }
      ]
    );
  }

  const isUserLoggedIn = Boolean(user);
  const label = isUserLoggedIn ? "Đăng xuất" : "Đổi vai trò";
  const icon = isUserLoggedIn ? "log-out-outline" : "swap-horizontal";

  const isOnBrand = variant === "onBrand";
  const iconColor = isOnBrand ? "#FFFFFF" : theme.danger;
  const textColor = isOnBrand ? "#FFFFFF" : theme.danger;
  const bgColor = isOnBrand
    ? "rgba(255, 255, 255, 0.2)"
    : "rgba(220, 38, 38, 0.08)";
  const borderColor = isOnBrand
    ? "rgba(255, 255, 255, 0.3)"
    : "rgba(220, 38, 38, 0.25)";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bgColor,
          borderColor,
          marginRight: isOnBrand ? 0 : 12,
          opacity: pressed ? 0.7 : 1
        }
      ]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={iconColor}
        style={styles.icon}
      />
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
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
    paddingVertical: 5
  },
  icon: {
    marginRight: 4
  },
  label: {
    fontSize: 12,
    fontWeight: "700"
  }
});
