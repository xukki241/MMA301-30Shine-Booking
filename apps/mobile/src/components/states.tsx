import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/constants/theme";

export function LoadingState({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.border }
      ]}
    >
      <ActivityIndicator color={theme.brand} size="large" />
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

// Map any legacy emoji strings to crisp vector icons
const EMOJI_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  "📭": "calendar-outline",
  "📍": "location-outline",
  "✂️": "cut-outline",
  "🕒": "time-outline",
  "🪑": "calendar-outline",
  "⚠️": "alert-circle-outline",
  "💳": "card-outline"
};

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap | string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  icon = "albums-outline",
  title,
  description,
  action
}: EmptyStateProps) {
  const theme = useAppTheme();

  const resolvedIconName: keyof typeof Ionicons.glyphMap =
    EMOJI_ICON_MAP[icon] ||
    (icon in Ionicons.glyphMap
      ? (icon as keyof typeof Ionicons.glyphMap)
      : "albums-outline");

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border
        }
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: theme.surfaceHighlight,
            borderColor: theme.borderLight
          }
        ]}
      >
        <Ionicons name={resolvedIconName} size={30} color={theme.textMuted} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.label, { color: theme.textMuted }]}>
        {description}
      </Text>
      {action ? <View style={styles.actionWrap}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    justifyContent: "center",
    minHeight: 200,
    padding: 24
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center"
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280
  },
  actionWrap: {
    marginTop: 8,
    width: "100%",
    alignItems: "center"
  }
});
