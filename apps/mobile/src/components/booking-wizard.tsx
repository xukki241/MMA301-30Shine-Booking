import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formatDate, formatSlot } from "@/booking/dates";
import type { CompleteBookingDraft } from "@/booking/types";
import { useAppTheme } from "@/constants/theme";

export function WizardProgress({ step }: { step: number }) {
  const theme = useAppTheme();
  const stepTitles = [
    "1. Chọn Salon",
    "2. Chọn Dịch vụ",
    "3. Chọn Stylist",
    "4. Chọn Ngày & Giờ",
    "5. Xác nhận"
  ];

  return (
    <View style={styles.progressContainer} accessibilityLabel={step < 4 ? `Bước ${step + 1} trên 4` : "Xem lại và xác nhận"}>
      <View style={styles.progressHeaderRow}>
        <Text style={[styles.progressLabel, { color: theme.brand }]}>
          {stepTitles[step] || `Bước ${step + 1}`}
        </Text>
        <Text style={[styles.progressStepCount, { color: theme.textMuted }]}>
          {step + 1}/5
        </Text>
      </View>
      <View style={styles.progressTrack}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              { backgroundColor: index <= step ? theme.brand : theme.border }
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function StepSectionHeader({
  stepNumber,
  title,
  subtitle,
  rightAction
}: {
  stepNumber: number | string;
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.stepSectionHeader}>
      <View style={styles.stepHeaderLeft}>
        <View style={[styles.stepNumberBadge, { backgroundColor: theme.brand }]}>
          <Text style={styles.stepNumberText}>{stepNumber}</Text>
        </View>
        <View style={styles.stepHeaderTitles}>
          <Text style={[styles.stepSectionTitle, { color: theme.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.stepSectionSubtitle, { color: theme.textMuted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightAction}
    </View>
  );
}

type SelectableCardProps = {
  label: string;
  detail?: string;
  badge?: string;
  price?: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
};

export function SelectableCard({
  label,
  detail,
  badge,
  price,
  selected,
  onPress,
  compact = false,
  iconName
}: SelectableCardProps) {
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
          backgroundColor: selected ? (theme.isDark ? "#1E2B42" : "#F0F5FF") : theme.surface,
          borderColor: selected ? theme.brand : theme.border,
          opacity: pressed ? 0.8 : 1
        }
      ]}
    >
      <View
        style={[
          styles.checkboxCircle,
          {
            borderColor: selected ? theme.brand : theme.textDim,
            backgroundColor: selected ? theme.brand : "transparent"
          }
        ]}
      >
        {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
      </View>

      {iconName ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: selected ? theme.brandMuted : theme.surfaceHighlight }
          ]}
        >
          <Ionicons
            name={iconName}
            size={18}
            color={selected ? theme.brand : theme.textMuted}
          />
        </View>
      ) : null}

      <View style={styles.optionCopy}>
        <View style={styles.labelRow}>
          <Text style={[styles.optionTitle, { color: theme.text }]}>{label}</Text>
          {badge ? (
            <View style={[styles.smallBadge, { backgroundColor: "#EF4444" }]}>
              <Text style={styles.smallBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {detail ? (
          <Text style={[styles.optionDetail, { color: theme.textMuted }]} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
        {price ? (
          <Text style={[styles.optionPrice, { color: theme.brand }]}>{price}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function BookingSummary({ booking }: { booking: CompleteBookingDraft }) {
  const theme = useAppTheme();
  const rows = [
    { label: "Salon", value: booking.branch.name, icon: "location-outline" },
    { label: "Dịch vụ", value: booking.service.name, icon: "cut-outline" },
    { label: "Stylist", value: booking.stylist.name, icon: "person-outline" },
    { label: "Ngày cắt", value: formatDate(booking.date), icon: "calendar-outline" },
    { label: "Khung giờ", value: formatSlot(booking.slot), icon: "time-outline" },
    { label: "Thời lượng", value: `${booking.service.durationMinutes} phút`, icon: "timer-outline" }
  ];

  return (
    <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.summaryTop}>
        <View style={[styles.summaryBrandDot, { backgroundColor: theme.brand }]} />
        <Text style={[styles.summaryHeaderTitle, { color: theme.text }]}>Chi tiết lịch hẹn</Text>
      </View>

      <View style={styles.summaryDivider} />

      {rows.map((row) => (
        <View key={row.label} style={styles.summaryRow}>
          <View style={styles.summaryRowLeft}>
            <Ionicons name={row.icon as keyof typeof Ionicons.glyphMap} size={16} color={theme.textMuted} />
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{row.label}</Text>
          </View>
          <Text style={[styles.summaryValue, { color: theme.text }]}>{row.value}</Text>
        </View>
      ))}

      <View style={styles.summaryDivider} />

      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: theme.text }]}>Tổng tạm tính:</Text>
        <Text style={[styles.totalPrice, { color: theme.brand }]}>
          {new Intl.NumberFormat("vi-VN").format(booking.service.priceVnd)} ₫
        </Text>
      </View>
      <Text style={[styles.payLaterNote, { color: theme.textMuted }]}>
        * Thanh toán tại salon sau khi hoàn tất dịch vụ.
      </Text>
    </View>
  );
}

export function WizardAction({
  label,
  onPress,
  disabled = false,
  loading = false,
  secondary = false
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
          backgroundColor: secondary
            ? theme.surface
            : pressed
            ? theme.brandPressed
            : theme.brand,
          borderColor: secondary ? theme.border : theme.brand,
          opacity: disabled ? 0.45 : 1
        }
      ]}
    >
      {loading ? <ActivityIndicator color={secondary ? theme.brand : "#FFFFFF"} /> : null}
      <Text style={[styles.actionText, { color: secondary ? theme.text : "#FFFFFF" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.error, { borderColor: theme.danger, backgroundColor: theme.surface }]}
    >
      <Ionicons name="alert-circle" size={18} color={theme.danger} />
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
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  progressStepCount: {
    fontSize: 12,
    fontWeight: "600"
  },
  progressTrack: {
    flexDirection: "row",
    gap: 6
  },
  progressSegment: {
    borderRadius: 4,
    flex: 1,
    height: 5
  },
  stepSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  stepHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  stepHeaderTitles: {
    gap: 1
  },
  stepSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  stepSectionSubtitle: {
    fontSize: 12
  },
  option: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 10
  },
  compactOption: {
    minHeight: 52,
    paddingVertical: 8,
    marginHorizontal: 0,
    marginBottom: 0
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center"
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  optionCopy: {
    flex: 1,
    gap: 3
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700"
  },
  smallBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1
  },
  smallBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800"
  },
  optionDetail: {
    fontSize: 12,
    lineHeight: 17
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2
  },
  summary: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    gap: 10
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  summaryBrandDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  summaryHeaderTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 4
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2
  },
  summaryRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  summaryLabel: {
    fontSize: 13
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700"
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "900"
  },
  payLaterNote: {
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "right"
  },
  action: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14
  },
  actionText: {
    fontSize: 15,
    fontWeight: "800"
  },
  error: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginHorizontal: 16
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18
  },
  retry: {
    fontSize: 14,
    fontWeight: "800"
  }
});
