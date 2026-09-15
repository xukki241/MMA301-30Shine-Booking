import { useColorScheme } from "react-native";

const shared = {
  brand: "#E11D2E",
  brandPressed: "#B71322",
  accent: "#F59E0B",
  success: "#15803D",
  danger: "#DC2626",
  radius: 18,
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
  surfaceMuted: "#F1F5F9",
  text: "#172033",
  textMuted: "#64748B",
  border: "#E2E8F0"
} as const;

const darkTheme = {
  ...shared,
  isDark: true,
  background: "#0F172A",
  surface: "#182235",
  surfaceMuted: "#243047",
  text: "#F8FAFC",
  textMuted: "#A8B3C7",
  border: "#334155"
} as const;

export function useAppTheme() {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}

export type AppTheme = ReturnType<typeof useAppTheme>;
