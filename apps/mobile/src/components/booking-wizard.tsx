import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { formatDate, formatSlot } from "@/booking/dates";
import type { CompleteBookingDraft } from "@/booking/types";
import { useAppTheme } from "@/constants/theme";

export function WizardProgress({ step }: { step: number }) {
  const theme = useAppTheme();
  return (
    <View accessibilityLabel={step < 4 ? `Bước ${step + 1} trên 4` : "Xem lại và xác nhận"}>
      <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
        {step < 4 ? `Bước ${step + 1}/4` : "Xem lại và xác nhận"}
      </Text>
      <View style={styles.progressTrack}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[styles.progressSegment, { backgroundColor: index <= step ? theme.brand : theme.border }]}
          />
        ))}
      </View>
    </View>
  );
}

type SelectableCardProps = {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
};

export function SelectableCard({ label, detail, selected, onPress, compact = false }: SelectableCardProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        compact && styles.compactOption,
        {
          backgroundColor: selected ? theme.surfaceMuted : theme.surface,
          borderColor: selected ? theme.brand : theme.border,
          opacity: pressed ? 0.75 : 1
        }
      ]}
    >
      <View style={styles.optionCopy}>
        <Text style={[styles.optionTitle, { color: theme.text }]}>{label}</Text>
        {detail ? <Text style={[styles.optionDetail, { color: theme.textMuted }]}>{detail}</Text> : null}
      </View>
      <View style={[styles.indicator, { borderColor: selected ? theme.brand : theme.border }]}>
        {selected ? <View style={[styles.indicatorFill, { backgroundColor: theme.brand }]} /> : null}
      </View>
    </Pressable>
  );
}

export function BookingSummary({ booking }: { booking: CompleteBookingDraft }) {
  const theme = useAppTheme();
  const rows = [
    ["Chi nhánh", booking.branch.name],
    ["Dịch vụ", booking.service.name],
    ["Stylist", booking.stylist.name],
    ["Ngày", formatDate(booking.date)],
    ["Khung giờ", formatSlot(booking.slot)],
    ["Thời lượng", `${booking.service.durationMinutes} phút`],
    ["Giá tham khảo", `${new Intl.NumberFormat("vi-VN").format(booking.service.priceVnd)} ₫`]
  ];
  return (
    <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{label}</Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

export function WizardAction({
  label, onPress, disabled = false, loading = false, secondary = false
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: secondary ? theme.surface : pressed ? theme.brandPressed : theme.brand,
          borderColor: secondary ? theme.border : theme.brand,
          opacity: disabled ? 0.45 : 1
        }
      ]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : null}
      <Text style={[styles.actionText, { color: secondary ? theme.text : "#FFFFFF" }]}>{label}</Text>
    </Pressable>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const theme = useAppTheme();
  return (
    <View accessibilityLiveRegion="polite" style={[styles.error, { borderColor: theme.danger, backgroundColor: theme.surface }]}>
      <Text style={[styles.errorText, { color: theme.text }]}>{message}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Thử tải lại" onPress={onRetry}>
          <Text style={[styles.retry, { color: theme.brand }]}>Thử lại</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  progressLabel: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  progressTrack: { flexDirection: "row", gap: 6 },
  progressSegment: { borderRadius: 4, flex: 1, height: 6 },
  option: { alignItems: "center", borderRadius: 16, borderWidth: 2, flexDirection: "row", gap: 12, minHeight: 72, padding: 14 },
  compactOption: { minHeight: 64 },
  optionCopy: { flex: 1, gap: 4 },
  optionTitle: { fontSize: 16, fontWeight: "700" },
  optionDetail: { fontSize: 13, lineHeight: 19 },
  indicator: { alignItems: "center", borderRadius: 10, borderWidth: 2, height: 20, justifyContent: "center", width: 20 },
  indicatorFill: { borderRadius: 5, height: 10, width: 10 },
  summary: { borderRadius: 18, borderWidth: 1, gap: 14, padding: 18 },
  summaryRow: { gap: 4 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 16, fontWeight: "700" },
  action: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 14 },
  actionText: { fontSize: 16, fontWeight: "800" },
  error: { borderRadius: 14, borderWidth: 1, gap: 8, padding: 14 },
  errorText: { fontSize: 14, lineHeight: 21 },
  retry: { fontSize: 15, fontWeight: "800" }
});
