import type { PropsWithChildren, ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { useAppTheme } from "@/constants/theme";

type ScreenProps = PropsWithChildren<{
  eyebrow?: string;
  title?: string;
  description?: string;
  headerContent?: ReactNode;
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
  contentContainerStyle,
  children
}: ScreenProps) {
  const theme = useAppTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
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
    </ScrollView>
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

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
    marginTop: 6
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  },
  body: {
    gap: 16,
    marginTop: 20
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 18,
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
  }
});
