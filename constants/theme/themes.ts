/**
 * Built-in themes.
 *
 * Palettes are literal on purpose — see the note in `tokens.ts`. Adding a
 * theme means adding a palette here and exporting it through `themes`.
 */

import type {
  OverlayTokens,
  PaletteColors,
  ThemeColors,
  ThemeMode,
  ThemeTokens,
} from "./tokens";
import { BrandColors } from "./tokens";
import { buildTextFn, interFontFamilies, typeScale } from "./typography";

const darkColors: ThemeColors = {
  primary: "#6C63FF",
  primaryLight: "#8B83FF",
  primaryDark: "#4F46E5",
  secondary: "#00D9A6",
  secondaryLight: "#33E4BC",
  secondaryDark: "#00B88A",
  accent: "#FF6B9D",
  warning: "#FFB84D",
  error: "#FF5757",
  success: "#00D9A6",
  info: "#5BC0EB",
  background: "#0D1117",
  backgroundSecondary: "#161B22",
  backgroundTertiary: "#1C2333",
  backgroundElevated: "#21283B",
  surface: "#1C2333",
  surfaceHover: "#242D42",
  surfaceBorder: "#30363D",
  glass: "rgba(28, 35, 51, 0.85)",
  glassBorder: "rgba(99, 115, 155, 0.2)",
  glassHighlight: "rgba(108, 99, 255, 0.08)",
  text: "#F0F6FC",
  textSecondary: "#8B949E",
  textTertiary: "#484F58",
  textInverse: "#0D1117",
  gradientPrimary: ["#6C63FF", "#8B83FF"],
  gradientSecondary: ["#00D9A6", "#00B88A"],
  gradientDark: ["#0D1117", "#161B22"],
  gradientCard: ["rgba(28, 35, 51, 0.9)", "rgba(13, 17, 23, 0.95)"],
  gradientHero: ["transparent", "rgba(13, 17, 23, 0.6)", "#0D1117"],
  badgeMonitored: "#00D9A6",
  badgeUnmonitored: "#484F58",
  badgeDownloading: "#5BC0EB",
  badgeMissing: "#FF5757",
  badgeAvailable: "#00D9A6",
};

const lightColors: ThemeColors = {
  primary: "#4F46E5",
  primaryLight: "#6C63FF",
  primaryDark: "#3730A3",
  secondary: "#00B88A",
  secondaryLight: "#00D9A6",
  secondaryDark: "#009973",
  accent: "#E8457A",
  warning: "#E6A030",
  error: "#DC3545",
  success: "#00B88A",
  info: "#3A9FD8",
  background: "#F0F6FC",
  backgroundSecondary: "#FFFFFF",
  backgroundTertiary: "#E8EDF3",
  backgroundElevated: "#FFFFFF",
  surface: "#E8EDF3",
  surfaceHover: "#D0D7E0",
  surfaceBorder: "#C8D1DA",
  glass: "rgba(255, 255, 255, 0.85)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
  glassHighlight: "rgba(79, 70, 229, 0.06)",
  text: "#0D1117",
  textSecondary: "#57606A",
  textTertiary: "#8B949E",
  textInverse: "#F0F6FC",
  gradientPrimary: ["#4F46E5", "#6C63FF"],
  gradientSecondary: ["#00B88A", "#009973"],
  gradientDark: ["#E8EDF3", "#F0F6FC"],
  gradientCard: ["rgba(255, 255, 255, 0.95)", "rgba(240, 246, 252, 0.98)"],
  gradientHero: ["transparent", "rgba(240, 246, 252, 0.6)", "#F0F6FC"],
  badgeMonitored: "#00B88A",
  badgeUnmonitored: "#8B949E",
  badgeDownloading: "#3A9FD8",
  badgeMissing: "#DC3545",
  badgeAvailable: "#00B88A",
};

/**
 * Player chrome sits over video, so it stays light-on-dark whatever the theme
 * mode is. Shared across themes rather than declared per-theme.
 */
const overlay: OverlayTokens = {
  text: "#fff",
  textSecondary: "rgba(255,255,255,0.7)",
  textMuted: "rgba(255,255,255,0.85)",
  textFaint: "rgba(255,255,255,0.5)",
  icon: "rgba(255,255,255,0.8)",
  scrimTop: "rgba(0,0,0,0.5)",
  scrimBottom: "rgba(0,0,0,0.6)",
  control: "rgba(255,255,255,0.12)",
  controlActive: "rgba(255,255,255,0.15)",
  surface: "rgba(30,30,30,0.95)",
  backdrop: "rgba(0,0,0,0.6)",
  shadow: "#000",
};

const interText = buildTextFn(interFontFamilies);

/**
 * Assembles a theme. Brand colors are folded into the palette here so
 * `useColors()` can hand back `theme.colors` directly, with no per-render merge.
 */
function createTheme(
  id: string,
  name: string,
  mode: ThemeMode,
  colors: ThemeColors,
): ThemeTokens {
  const palette: PaletteColors = { ...colors, ...BrandColors };
  return {
    id,
    name,
    mode,
    colors: palette,
    overlay,
    fonts: interFontFamilies,
    type: typeScale,
    text: interText,
  };
}

export const darkTheme = createTheme("dark", "Dark", "dark", darkColors);
export const lightTheme = createTheme("light", "Light", "light", lightColors);

/** Every theme the user can pick. */
export const themes: ThemeTokens[] = [darkTheme, lightTheme];

export const DEFAULT_THEME_ID = "dark";

export function themeById(id: string): ThemeTokens | undefined {
  return themes.find((t) => t.id === id);
}
