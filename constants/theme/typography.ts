/**
 * JellyRoll Design System — Typography Tokens
 *
 * The scale is derived from what the app actually renders, not from an
 * idealised ramp: every step below matches a font size already in use, so
 * adopting it shifts no type. Measured before the migration —
 * 15 (33x), 14 (33x), 13 (30x), 12 (25x), 11 (18x), 18 (13x), 16 (11x),
 * 10 (10x), 28 (5x), 22 (5x), 24 (4x), 9 (2x), 20 (1x). Only the two
 * outliers (9 and 20) normalise, to `micro` and `h2`.
 *
 * `lineHeight`s are calibrated against the values components already set
 * explicitly (30, 24, 22, 20, 18), so the steps that had one keep it.
 */

/**
 * Registered font family names.
 *
 * These MUST match what's passed to `useFonts()` in `app/_layout.tsx` —
 * @expo-google-fonts registers each weight under its own family name, so
 * there is no single "Inter" family with a numeric `fontWeight`.
 *
 * Swapping the app's typeface is this object and the `useFonts()` call.
 */
export interface FontFamilies {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
}

export const interFontFamilies: FontFamilies = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};

/**
 * One step of the scale: size and rhythm only.
 *
 * Weight is deliberately NOT part of a step. Measured across the app, weight
 * varies independently of size — at 14px alone the split is 17 regular /
 * 11 medium / 18 semibold / 2 bold — so baking a default weight into each step
 * would be wrong ~43% of the time and silently so. Use `theme.text()`, which
 * requires both axes.
 */
export interface TypeStep {
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: "uppercase";
}

/** A complete, spreadable text style — a step plus a resolved family. */
export type TextStyleToken = TypeStep & { fontFamily: string };

export interface TypeScale {
  display: TypeStep;
  h1: TypeStep;
  h2: TypeStep;
  h3: TypeStep;
  title: TypeStep;
  body: TypeStep;
  bodySmall: TypeStep;
  caption: TypeStep;
  label: TypeStep;
  labelSmall: TypeStep;
  micro: TypeStep;
}

export type TypeStepName = keyof TypeScale;
export type FontWeightName = keyof FontFamilies;

export const typeScale: TypeScale = {
  display: { fontSize: 28, lineHeight: 36, letterSpacing: -0.5 },
  h1: { fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontSize: 22, lineHeight: 30, letterSpacing: -0.2 },
  h3: { fontSize: 18, lineHeight: 24 },
  title: { fontSize: 16, lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 22 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16 },
  labelSmall: { fontSize: 11, lineHeight: 16 },
  micro: { fontSize: 10, lineHeight: 14 },
};

/**
 * Builds the `text()` helper for a theme's typeface.
 *
 *   title: { ...theme.text("body", "semibold"), color: colors.text }
 *
 * Always returns both axes, so a text style can't silently fall back to the
 * system font by forgetting `fontFamily`.
 */
export function buildTextFn(fonts: FontFamilies) {
  return (step: TypeStepName, weight: FontWeightName): TextStyleToken => ({
    ...typeScale[step],
    fontFamily: fonts[weight],
  });
}

export type TextFn = ReturnType<typeof buildTextFn>;
