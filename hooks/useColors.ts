/**
 * useColors — Theme-aware color hook
 *
 * Returns the active color palette based on the user's theme preference
 * (from settings store) resolved against the device color scheme.
 *
 * Usage:
 *   const colors = useColors();
 *   <View style={{ backgroundColor: colors.background }} />
 */

import { BrandColors, ThemeColors, Themes } from '../constants/Colors';
import { useEffectiveScheme } from './useEffectiveScheme';

export type AppColors = ThemeColors & typeof BrandColors;

export function useColors(): AppColors {
    const scheme = useEffectiveScheme();
    return {
        ...Themes[scheme],
        ...BrandColors,
    };
}
