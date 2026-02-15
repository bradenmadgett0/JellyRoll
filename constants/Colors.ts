/**
 * JellyRoll Design System — Color Tokens
 * Premium dark theme with vibrant accents, structured for theme switching
 */

/** Per-theme color tokens shape */
export interface ThemeColors {
    // Core palette
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    accent: string;
    warning: string;
    error: string;
    success: string;
    info: string;

    // Backgrounds
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    backgroundElevated: string;
    surface: string;
    surfaceHover: string;
    surfaceBorder: string;

    // Glass effect
    glass: string;
    glassBorder: string;
    glassHighlight: string;

    // Text
    text: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;

    // Gradients (start, end)
    gradientPrimary: readonly [string, string];
    gradientSecondary: readonly [string, string];
    gradientDark: readonly [string, string];
    gradientCard: readonly [string, string];
    gradientHero: readonly [string, string, string];

    // Badges
    badgeMonitored: string;
    badgeUnmonitored: string;
    badgeDownloading: string;
    badgeMissing: string;
    badgeAvailable: string;
}

/** Dark theme palette */
const dark: ThemeColors = {
    // Core palette
    primary: '#6C63FF',        // Vibrant indigo
    primaryLight: '#8B83FF',
    primaryDark: '#4F46E5',
    secondary: '#00D9A6',      // Teal accent
    secondaryLight: '#33E4BC',
    secondaryDark: '#00B88A',
    accent: '#FF6B9D',         // Pink accent
    warning: '#FFB84D',        // Amber warning
    error: '#FF5757',          // Red error
    success: '#00D9A6',        // Teal success
    info: '#5BC0EB',           // Light blue info

    // Backgrounds
    background: '#0D1117',           // Deep dark
    backgroundSecondary: '#161B22',  // Slightly lighter
    backgroundTertiary: '#1C2333',   // Card surfaces
    backgroundElevated: '#21283B',   // Elevated surfaces
    surface: '#1C2333',
    surfaceHover: '#242D42',
    surfaceBorder: '#30363D',

    // Glass effect
    glass: 'rgba(28, 35, 51, 0.85)',
    glassBorder: 'rgba(99, 115, 155, 0.2)',
    glassHighlight: 'rgba(108, 99, 255, 0.08)',

    // Text
    text: '#F0F6FC',
    textSecondary: '#8B949E',
    textTertiary: '#484F58',
    textInverse: '#0D1117',

    // Gradients
    gradientPrimary: ['#6C63FF', '#8B83FF'],
    gradientSecondary: ['#00D9A6', '#00B88A'],
    gradientDark: ['#0D1117', '#161B22'],
    gradientCard: ['rgba(28, 35, 51, 0.9)', 'rgba(13, 17, 23, 0.95)'],
    gradientHero: ['transparent', 'rgba(13, 17, 23, 0.6)', '#0D1117'],

    // Badges
    badgeMonitored: '#00D9A6',
    badgeUnmonitored: '#484F58',
    badgeDownloading: '#5BC0EB',
    badgeMissing: '#FF5757',
    badgeAvailable: '#00D9A6',
};

/** Light theme palette */
const light: ThemeColors = {
    // Core palette
    primary: '#4F46E5',
    primaryLight: '#6C63FF',
    primaryDark: '#3730A3',
    secondary: '#00B88A',
    secondaryLight: '#00D9A6',
    secondaryDark: '#009973',
    accent: '#E8457A',
    warning: '#E6A030',
    error: '#DC3545',
    success: '#00B88A',
    info: '#3A9FD8',

    // Backgrounds
    background: '#F0F6FC',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#E8EDF3',
    backgroundElevated: '#FFFFFF',
    surface: '#E8EDF3',
    surfaceHover: '#D0D7E0',
    surfaceBorder: '#C8D1DA',

    // Glass effect
    glass: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(0, 0, 0, 0.08)',
    glassHighlight: 'rgba(79, 70, 229, 0.06)',

    // Text
    text: '#0D1117',
    textSecondary: '#57606A',
    textTertiary: '#8B949E',
    textInverse: '#F0F6FC',

    // Gradients
    gradientPrimary: ['#4F46E5', '#6C63FF'],
    gradientSecondary: ['#00B88A', '#009973'],
    gradientDark: ['#E8EDF3', '#F0F6FC'],
    gradientCard: ['rgba(255, 255, 255, 0.95)', 'rgba(240, 246, 252, 0.98)'],
    gradientHero: ['transparent', 'rgba(240, 246, 252, 0.6)', '#F0F6FC'],

    // Badges
    badgeMonitored: '#00B88A',
    badgeUnmonitored: '#8B949E',
    badgeDownloading: '#3A9FD8',
    badgeMissing: '#DC3545',
    badgeAvailable: '#00B88A',
};

/**
 * Brand / service colors — shared across themes
 */
export const BrandColors = {
    jellyfin: '#00A4DC',
    sonarr: '#35C5F4',
    radarr: '#FFC230',
    lidarr: '#1DB954',
};

/**
 * Theme palettes indexed by scheme name.
 * Use the `useColors()` hook in components to get the active palette.
 */
export const Themes = { dark, light } as const;

/**
 * Static reference to the dark palette.
 *
 * For new code, prefer `useColors()` from `hooks/useColors` so that
 * components respond to theme changes. This export keeps existing
 * consumers working during the incremental migration.
 */
export const Colors = {
    // Backward compatibility: spreads dark tokens to the top level so existing
    // `Colors.background`-style imports continue to work. Remove once all
    // components migrate to `useColors()`.
    ...dark,
    ...BrandColors,
    light,
    dark,
};
