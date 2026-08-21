/**
 * JellyRoll Design System — Token shapes.
 *
 * A theme is a literal palette. There's no derivation layer: the design
 * direction is still moving, and deriving tokens from a seed meant baking in
 * assumptions (a "glass" layer, a fixed elevation ramp) before those had
 * settled. Revisit generated/custom themes once the design does.
 */

import type { FontFamilies, TextFn, TypeScale } from "./typography";

export type ThemeMode = "dark" | "light";

/** Per-theme color tokens. */
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

  // Gradients (start → end)
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

/** Brand / service colors — identical across themes. */
export const BrandColors = {
  jellyfin: "#00A4DC",
  sonarr: "#35C5F4",
  radarr: "#FFC230",
  lidarr: "#1DB954",
};

/** What components actually receive: the theme palette plus brand colors. */
export type PaletteColors = ThemeColors & typeof BrandColors;

/**
 * Surfaces that sit on top of video and are deliberately light-on-dark
 * regardless of the active theme's mode — the player controls, the track
 * pickers, the scrims.
 */
export interface OverlayTokens {
  /** Primary control/label color over video. */
  text: string;
  /** Inactive or secondary labels — picker options, episode subtitles. */
  textSecondary: string;
  /** De-emphasised labels — timestamps, current selection. */
  textMuted: string;
  /** Faint labels — the bitrate readout. */
  textFaint: string;
  /** Icon glyphs on controls. */
  icon: string;
  scrimTop: string;
  scrimBottom: string;
  /** Control chip background (quality/audio buttons). */
  control: string;
  /** Pressed or selected control chip. */
  controlActive: string;
  /** Modal/sheet background floating over video. */
  surface: string;
  /** Full-screen dim behind a modal. */
  backdrop: string;
  /** Drop shadow beneath the scrubber thumb. */
  shadow: string;
}

/** A theme, fully resolved and ready for StyleSheet use. */
export interface ThemeTokens {
  id: string;
  name: string;
  mode: ThemeMode;
  colors: PaletteColors;
  overlay: OverlayTokens;
  fonts: FontFamilies;
  type: TypeScale;
  /** Builds a complete text style: `theme.text("body", "semibold")`. */
  text: TextFn;
}
