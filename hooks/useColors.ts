/**
 * useColors — the active color palette.
 *
 * A thin view over `useTheme()` for the many components that only need colors.
 * Reach for `useTheme()` when you also need `text()` or `overlay`.
 *
 * Usage:
 *   const colors = useColors();
 *   <View style={{ backgroundColor: colors.background }} />
 */

import type { PaletteColors } from "../constants/theme";
import { useTheme } from "./useTheme";

export type AppColors = PaletteColors;

export function useColors(): AppColors {
  return useTheme().colors;
}
