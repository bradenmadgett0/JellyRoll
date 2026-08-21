/**
 * JellyRoll Design System.
 *
 * Colors and fonts are defined here and nowhere else.
 *
 *   const theme = useTheme();        // colors, overlay, fonts, type, text()
 *   const colors = useColors();      // just the palette
 *   const styles = useThemedStyles(createStyles);
 *
 * To change the typeface, edit `interFontFamilies` in `typography.ts` and the
 * matching `useFonts()` registration in `app/_layout.tsx`.
 */

export { BrandColors } from "./tokens";
export type {
  OverlayTokens,
  PaletteColors,
  ThemeColors,
  ThemeMode,
  ThemeTokens,
} from "./tokens";
export { darkTheme, DEFAULT_THEME_ID, lightTheme, themeById, themes } from "./themes";
export type { FontWeightName, TypeScale, TypeStepName } from "./typography";
export { interFontFamilies } from "./typography";
