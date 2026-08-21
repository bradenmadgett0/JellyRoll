/**
 * sectionStyles — Shared "section title" style reused by the detail screen's
 * generic sections (Overview, Cast, Studios, Media Info).
 */

import { Spacing } from "../../../constants/Spacing";
import type { ThemeTokens } from "../../../constants/theme";
import { AppColors } from "../../../hooks/useColors";

export const sectionStyles = (colors: AppColors, theme: ThemeTokens) => ({
  sectionTitle: {
    ...theme.text("h3", "semibold"),
    color: colors.text,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
});
