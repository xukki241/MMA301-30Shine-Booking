import { useColorScheme } from "react-native";

const shared = {
  brand: "#1B2A4A",
  brandLight: "#2B4C8C",
  brandPressed: "#142040",
  brandMuted: "rgba(27, 42, 74, 0.10)",
  accent: "#F5B731",
  accentPressed: "#D9A020",
  accentMuted: "rgba(245, 183, 49, 0.15)",
  gold: "#F5B731",
  goldMuted: "rgba(245, 183, 49, 0.15)",
  success: "#10B981",
  successMuted: "rgba(16, 185, 129, 0.15)",
  danger: "#DC2626",
  info: "#3B82F6",
  infoMuted: "rgba(59, 130, 246, 0.10)",
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
  background: "#F2F4F7",
  surface: "#FFFFFF",
  surfaceHighlight: "#EEF2F7",
  surfaceMuted: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  textDim: "#94A3B8",
  textOnBrand: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "rgba(0, 0, 0, 0.06)",
  cardShadow: "rgba(15, 23, 42, 0.08)"
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
  textOnBrand: "#FFFFFF",
  border: "#233048",
  borderLight: "rgba(255, 255, 255, 0.08)",
  cardShadow: "rgba(0, 0, 0, 0.35)"
} as const;

export function useAppTheme() {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}

export type AppTheme = ReturnType<typeof useAppTheme>;
