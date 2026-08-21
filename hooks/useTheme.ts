/**
 * useTheme — the active design tokens.
 *
 * Themes are module constants, so the returned object is reference-stable for
 * free. That matters: `useThemedStyles` memoises its StyleSheet on this
 * identity.
 *
 * Usage:
 *   const { colors, text, overlay, mode } = useTheme();
 */

import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, themeById } from "../constants/theme";
import type { ThemeTokens } from "../constants/theme";
import { SYSTEM_THEME, useThemeStore } from "../services/stores/themeStore";

export function useTheme(): ThemeTokens {
  const deviceScheme = useColorScheme();
  const activeThemeId = useThemeStore((s) => s.activeThemeId);

  if (activeThemeId === SYSTEM_THEME) {
    return (deviceScheme ?? "dark") === "dark" ? darkTheme : lightTheme;
  }
  return themeById(activeThemeId) ?? darkTheme;
}
