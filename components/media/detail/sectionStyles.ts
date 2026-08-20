/**
 * sectionStyles — Shared "section title" style reused by the detail screen's
 * generic sections (Overview, Cast, Studios, Media Info).
 */

import { Spacing } from "../../../constants/Spacing";
import { AppColors } from "../../../hooks/useColors";

export const sectionStyles = (colors: AppColors) => ({
  sectionTitle: {
    fontFamily: "Inter_600SemiBold" as const,
    fontSize: 18,
    color: colors.text,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
});
