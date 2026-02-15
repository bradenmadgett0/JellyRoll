/**
 * JellyRoll Design System — Color Tokens
 * Premium dark theme with vibrant accents
 */

const tintColorDark = '#6C63FF';
const tintColorLight = '#4F46E5';

export const Colors = {
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

    // Server type colors
    jellyfin: '#00A4DC',      // Jellyfin blue
    sonarr: '#35C5F4',        // Sonarr blue
    radarr: '#FFC230',        // Radarr gold
    lidarr: '#1DB954',        // Lidarr green

    // Gradients (start, end)
    gradientPrimary: ['#6C63FF', '#8B83FF'] as const,
    gradientSecondary: ['#00D9A6', '#00B88A'] as const,
    gradientDark: ['#0D1117', '#161B22'] as const,
    gradientCard: ['rgba(28, 35, 51, 0.9)', 'rgba(13, 17, 23, 0.95)'] as const,
    gradientHero: ['transparent', 'rgba(13, 17, 23, 0.6)', '#0D1117'] as const,

    // Badges
    badgeMonitored: '#00D9A6',
    badgeUnmonitored: '#484F58',
    badgeDownloading: '#5BC0EB',
    badgeMissing: '#FF5757',
    badgeAvailable: '#00D9A6',

    // Light theme overrides (future)
    light: {
        text: '#0D1117',
        background: '#F0F6FC',
        tint: tintColorLight,
        icon: '#484F58',
        tabIconDefault: '#484F58',
        tabIconSelected: tintColorLight,
    },
    dark: {
        text: '#F0F6FC',
        background: '#0D1117',
        tint: tintColorDark,
        icon: '#8B949E',
        tabIconDefault: '#8B949E',
        tabIconSelected: tintColorDark,
    },
};
