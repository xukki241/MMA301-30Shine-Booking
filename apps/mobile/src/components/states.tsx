import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/constants/theme";

export function LoadingState({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={[styles.container, { borderColor: theme.border }]}
    >
      <ActivityIndicator color={theme.brand} size="large" />
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

type EmptyStateProps = {
  icon: string;
  title: string;
  description: string;
};

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.border }
      ]}
    >
      <Text accessibilityElementsHidden style={styles.icon}>
        {icon}
      </Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.label, { color: theme.textMuted }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 10,
    justifyContent: "center",
    minHeight: 220,
    padding: 28
  },
  icon: {
    fontSize: 38
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center"
  },
  label: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  }
});
