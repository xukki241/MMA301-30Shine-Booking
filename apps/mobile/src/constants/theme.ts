import { useColorScheme } from "react-native";

const shared = {
  brand: "#E11D2E",
  brandPressed: "#B71322",
  brandMuted: "rgba(225, 29, 46, 0.12)",
  accent: "#F59E0B",
  gold: "#F59E0B",
  goldMuted: "rgba(245, 158, 11, 0.15)",
  success: "#10B981",
  successMuted: "rgba(16, 185, 129, 0.15)",
  danger: "#DC2626",
  radius: 16,
  radiusSm: 10,
  radiusPill: 999,
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32
  }
} as const;

const lightTheme = {
  ...shared,
  isDark: false,
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceHighlight: "#F1F5F9",
  surfaceMuted: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  textDim: "#94A3B8",
  border: "#E2E8F0",
  borderLight: "rgba(0, 0, 0, 0.06)",
  cardShadow: "rgba(15, 23, 42, 0.06)"
} as const;

const darkTheme = {
  ...shared,
  isDark: true,
  background: "#0B0F19",
  surface: "#141C2E",
  surfaceHighlight: "#1E2B42",
  surfaceMuted: "#182235",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  textDim: "#64748B",
  border: "#233048",
  borderLight: "rgba(255, 255, 255, 0.08)",
  cardShadow: "rgba(0, 0, 0, 0.35)"
} as const;

export function useAppTheme() {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}

export type AppTheme = ReturnType<typeof useAppTheme>;
