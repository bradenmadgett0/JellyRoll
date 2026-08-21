/**
 * GenresLine — Genre list text shown for any media type
 */

import { StyleSheet, Text } from "react-native";
import type { ThemeTokens } from "@/constants/theme";
import { Spacing } from "../../../constants/Spacing";
import { AppColors } from "../../../hooks/useColors";
import { useThemedStyles } from "../../../hooks/useThemedStyles";

interface GenresLineProps {
  genres?: string[];
}

export function GenresLine({ genres }: GenresLineProps) {
  const styles = useThemedStyles(createStyles);
  if (!genres || genres.length === 0) return null;

  return <Text style={styles.genres}>{genres.join(" · ")}</Text>;
}

const createStyles = (colors: AppColors, theme: ThemeTokens) =>
  StyleSheet.create({
    genres: {
      ...theme.text("caption", "regular"),
      color: colors.primary,
      marginBottom: Spacing.md,
    },
  });
