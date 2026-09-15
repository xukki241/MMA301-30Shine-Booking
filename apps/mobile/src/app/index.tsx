import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/constants/theme";
import { type MobileRole, useRole } from "@/providers/role-provider";

const roles: Array<{
  role: MobileRole;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    role: "customer",
    icon: "✂️",
    title: "Customer",
    description: "Đặt lịch, theo dõi lịch hẹn và thanh toán sau khi hoàn thành."
  },
  {
    role: "stylist",
    icon: "🗓️",
    title: "Stylist",
    description: "Xem lịch làm việc hôm nay và xử lý lịch được phân công."
  }
];

export default function RolePickerScreen() {
  const theme = useAppTheme();
  const { selectRole } = useRole();

  function openShell(role: MobileRole) {
    selectRole(role);
    router.replace(
      role === "customer" ? "/(customer)/home" : "/(stylist)/today"
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.brandMark, { backgroundColor: theme.brand }]}>
          <Text style={styles.brandMarkText}>30</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>30Shine Booking</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Chọn vai trò demo để mở đúng không gian làm việc.
        </Text>

        <View style={styles.roles}>
          {roles.map((item) => (
            <Pressable
              key={item.role}
              accessibilityRole="button"
              accessibilityLabel={`Tiếp tục với vai trò ${item.title}`}
              onPress={() => openShell(item.role)}
              style={({ pressed }) => [
                styles.roleCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: pressed ? theme.brand : theme.border,
                  transform: [{ scale: pressed ? 0.985 : 1 }]
                }
              ]}
            >
              <Text style={styles.roleIcon}>{item.icon}</Text>
              <View style={styles.roleCopy}>
                <Text style={[styles.roleTitle, { color: theme.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.roleDescription, { color: theme.textMuted }]}>
                  {item.description}
                </Text>
              </View>
              <Text style={[styles.arrow, { color: theme.brand }]}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.notice, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.noticeText, { color: theme.textMuted }]}>
            SHINE-01 dùng role tạm trong bộ nhớ. Đăng nhập và JWT sẽ được nối ở
            SHINE-25.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22
  },
  brandMark: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900"
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    marginTop: 20
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8
  },
  roles: {
    gap: 14,
    marginTop: 30
  },
  roleCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    minHeight: 118,
    padding: 18
  },
  roleIcon: {
    fontSize: 30
  },
  roleCopy: {
    flex: 1,
    gap: 5
  },
  roleTitle: {
    fontSize: 19,
    fontWeight: "800"
  },
  roleDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  arrow: {
    fontSize: 32,
    fontWeight: "400"
  },
  notice: {
    borderRadius: 14,
    marginTop: 22,
    padding: 14
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19
  }
});
