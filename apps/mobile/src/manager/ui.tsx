import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/constants/theme";

export function ManagerField({ label, value, onChange, placeholder }: { label: string; value: string;
  onChange: (value: string) => void; placeholder?: string }) {
  const theme = useAppTheme();
  return <View style={styles.field}><Text style={{ color: theme.text, fontWeight: "700" }}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholder={placeholder} value={value} onChangeText={onChange}
      style={[styles.input, { borderColor: theme.border, color: theme.text }]} /></View>;
}

export function ManagerAction({
  label,
  onPress,
  selected = false,
  disabled = false,
  danger = false,
  variant = "outline",
  icon,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  danger?: boolean;
  variant?: "outline" | "primary" | "quiet";
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useAppTheme();
  const activeColor = danger ? theme.danger : theme.brand;
  const filled = selected || variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        {
          borderColor: variant === "quiet" ? "transparent" : filled ? activeColor : theme.border,
          backgroundColor: filled
            ? activeColor
            : danger
            ? theme.isDark
              ? "rgba(220, 38, 38, 0.15)"
              : "rgba(220, 38, 38, 0.08)"
            : variant === "quiet" ? "transparent" : theme.surface,
          opacity: disabled ? 0.5 : 1
        }
      ]}
    >
      {icon && <Ionicons name={icon} size={16} color={filled ? "#FFFFFF" : activeColor} />}
      <Text style={{ color: filled ? "white" : activeColor, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function ManagerRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
export const displayTime = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  field: { gap: 5 },
  input: { borderWidth: 1, borderRadius: 10, minHeight: 44, paddingHorizontal: 12 },
  action: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, minHeight: 42,
    flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start" },
});
