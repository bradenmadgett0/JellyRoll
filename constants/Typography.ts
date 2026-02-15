/**
 * JellyRoll Design System — Typography Tokens
 */

import { Platform } from 'react-native';

const fontFamily = Platform.select({
    ios: 'Inter',
    android: 'Inter',
    web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}) ?? 'Inter';

export const Typography = {
    fontFamily,

    // Display
    displayLarge: {
        fontFamily,
        fontSize: 32,
        lineHeight: 40,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
    },
    displayMedium: {
        fontFamily,
        fontSize: 28,
        lineHeight: 36,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
    },

    // Headings
    h1: {
        fontFamily,
        fontSize: 24,
        lineHeight: 32,
        fontWeight: '700' as const,
        letterSpacing: -0.2,
    },
    h2: {
        fontFamily,
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '600' as const,
    },
    h3: {
        fontFamily,
        fontSize: 17,
        lineHeight: 24,
        fontWeight: '600' as const,
    },

    // Body
    bodyLarge: {
        fontFamily,
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '400' as const,
    },
    body: {
        fontFamily,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400' as const,
    },
    bodySmall: {
        fontFamily,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '400' as const,
    },

    // Labels
    label: {
        fontFamily,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500' as const,
    },
    labelSmall: {
        fontFamily,
        fontSize: 11,
        lineHeight: 16,
        fontWeight: '500' as const,
        letterSpacing: 0.5,
        textTransform: 'uppercase' as const,
    },

    // Mono (for technical data like file sizes, bitrates)
    mono: {
        fontFamily: Platform.select({
            ios: 'Menlo',
            android: 'monospace',
            web: '"JetBrains Mono", "Fira Code", monospace',
        }),
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '400' as const,
    },
};
