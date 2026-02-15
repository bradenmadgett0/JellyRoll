/**
 * useThemedStyles — Theme-aware style factory
 *
 * Wraps a style factory function with useColors() so styles
 * automatically update when the theme changes.
 *
 * Usage:
 *   // Define the factory OUTSIDE the component (stable reference)
 *   const createStyles = (colors: AppColors) =>
 *     StyleSheet.create({
 *       container: { flex: 1, backgroundColor: colors.background },
 *       title: { color: colors.text, fontSize: 18 },
 *     });
 *
 *   // Inside the component
 *   const styles = useThemedStyles(createStyles);
 */

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { AppColors, useColors } from './useColors';

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

export function useThemedStyles<T extends NamedStyles<T>>(
    factory: (colors: AppColors) => T,
): T {
    const colors = useColors();
    return useMemo(() => factory(colors), [colors, factory]);
}
