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
  eyebrow: string;
  title: string;
  description: string;
}>;

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
};

export function Screen({ eyebrow, title, description, children }: ScreenProps) {
  const theme = useAppTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.eyebrow, { color: theme.brand }]}>{eyebrow}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.textMuted }]}>
        {description}
      </Text>
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

export function Card({ children, style }: CardProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
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
  accessibilityHint
}: PrimaryButtonProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: pressed ? theme.brandPressed : theme.brand }
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
    marginTop: 6
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8
  },
  body: {
    gap: 14,
    marginTop: 24
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 18
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  }
});
