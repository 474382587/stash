import { useColorScheme } from "react-native";

import { dark, light } from "src/theme/colors";
import type { ThemeColors } from "src/theme/colors";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  hero: 34,
} as const;

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}

export type { ThemeColors };
