import type { PropsWithChildren, ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type RefreshControlProps,
  type ViewStyle
} from "react-native";

import { useAppTheme } from "@/constants/theme";
import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";

type ScreenProps = PropsWithChildren<{
  eyebrow?: string;
  title?: string;
  description?: string;
  headerContent?: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  highlighted?: boolean;
}>;

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
};

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
};

type BadgeProps = {
  label: string;
  variant?: "brand" | "gold" | "success" | "muted";
};

export function Screen({
  eyebrow,
  title,
  description,
  headerContent,
  refreshControl,
  contentContainerStyle,
  children
}: ScreenProps) {
  const theme = useAppTheme();

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {headerContent}
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: theme.brand }]}>{eyebrow}</Text>
      ) : null}
      {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
      {description ? (
        <Text style={[styles.description, { color: theme.textMuted }]}>
          {description}
        </Text>
      ) : null}
      <View style={styles.body}>{children}</View>
    </KeyboardAwareScrollView>
  );
}

/** Navy-blue branded header banner */
export function BrandHeader({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const theme = useAppTheme();
  return (
    <View style={[styles.brandHeader, { backgroundColor: theme.brand }, style]}>
      {children}
    </View>
  );
}

export function Card({ children, style, highlighted = false }: CardProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: highlighted ? theme.surfaceHighlight : theme.surface,
          borderColor: highlighted ? theme.brand : theme.border,
          shadowColor: theme.cardShadow
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  return <Text style={[styles.cardTitle, { color: theme.text }]}>{children}</Text>;
}

export function CardText({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <Text style={[styles.cardText, { color: theme.textMuted }]}>{children}</Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  accessibilityHint,
  style,
  icon
}: PrimaryButtonProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: pressed ? theme.accentPressed : theme.accent },
        style
      ]}
    >
      <View style={styles.buttonInner}>
        {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
        <Text style={styles.primaryButtonText}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  accessibilityHint,
  style,
  icon
}: SecondaryButtonProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        {
          backgroundColor: pressed ? theme.surfaceHighlight : "transparent",
          borderColor: theme.border
        },
        style
      ]}
    >
      <View style={styles.buttonInner}>
        {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
        <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/** Navy-blue branded button (white text on navy) */
export function BrandButton({
  label,
  onPress,
  accessibilityHint,
  style,
  icon
}: PrimaryButtonProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: pressed ? theme.brandPressed : theme.brand },
        style
      ]}
    >
      <View style={styles.buttonInner}>
        {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
        <Text style={styles.primaryButtonText}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function Badge({ label, variant = "brand" }: BadgeProps) {
  const theme = useAppTheme();
  const palette = {
    brand: { bg: theme.brandMuted, text: theme.brand },
    gold: { bg: theme.goldMuted, text: theme.gold },
    success: { bg: theme.successMuted, text: theme.success },
    muted: { bg: theme.surfaceHighlight, text: theme.textMuted }
  }[variant];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

/** Menu list item with icon, title, subtitle, and chevron */
export function MenuItem({
  icon,
  title,
  subtitle,
  onPress
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: pressed ? theme.surfaceHighlight : theme.surface,
          borderBottomColor: theme.border
        }
      ]}
    >
      <View style={styles.menuIconWrap}>{icon}</View>
      <View style={styles.menuTextCol}>
        <Text style={[styles.menuTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.menuSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.menuChevron, { color: theme.textDim }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 40
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 20
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
    marginTop: 6,
    paddingHorizontal: 20
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    paddingHorizontal: 20
  },
  body: {
    gap: 12,
    marginTop: 16
  },
  brandHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 8
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 18,
    marginHorizontal: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700"
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  buttonIcon: {
    marginRight: 8
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600"
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14
  },
  menuTextCol: {
    flex: 1,
    gap: 2
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600"
  },
  menuSubtitle: {
    fontSize: 12
  },
  menuChevron: {
    fontSize: 22,
    fontWeight: "300",
    marginLeft: 8
  }
});
