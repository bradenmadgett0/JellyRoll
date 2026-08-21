/**
 * useThemedStyles — theme-aware style factory.
 *
 * Wraps a style factory so styles rebuild when the theme changes, and only
 * then — both arguments are stable for a given theme.
 *
 * Usage:
 *   // Define the factory OUTSIDE the component (stable reference)
 *   const createStyles = (colors: AppColors, theme: ThemeTokens) =>
 *     StyleSheet.create({
 *       container: { flex: 1, backgroundColor: colors.background },
 *       title: { ...theme.text("h3", "semibold"), color: colors.text },
 *     });
 *
 *   // Inside the component
 *   const styles = useThemedStyles(createStyles);
 *
 * The second argument is optional — factories that only need colors can keep
 * the one-parameter form.
 */

import { useMemo } from "react";
import { StyleSheet } from "react-native";
import type { ThemeTokens } from "../constants/theme";
import type { AppColors } from "./useColors";
import { useTheme } from "./useTheme";

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

export type StyleFactory<T> = (colors: AppColors, theme: ThemeTokens) => T;

export function useThemedStyles<T extends NamedStyles<T>>(
  factory: StyleFactory<T>,
): T {
  const theme = useTheme();
  return useMemo(() => factory(theme.colors, theme), [theme, factory]);
}
