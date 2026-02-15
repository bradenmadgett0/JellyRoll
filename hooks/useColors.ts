/**
 * useColors — Theme-aware color hook
 *
 * Returns the active color palette based on the device's color scheme.
 * Use this instead of importing `Colors` directly so that components
 * automatically respond to dark ↔ light theme changes.
 *
 * Usage:
 *   const colors = useColors();
 *   <View style={{ backgroundColor: colors.background }} />
 */

import { useColorScheme } from 'react-native';
import { BrandColors, ThemeColors, Themes } from '../constants/Colors';

export type AppColors = ThemeColors & typeof BrandColors;

export function useColors(): AppColors {
    const scheme = useColorScheme() ?? 'dark';
    return {
        ...Themes[scheme],
        ...BrandColors,
    };
}
