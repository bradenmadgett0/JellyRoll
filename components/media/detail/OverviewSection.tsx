/**
 * OverviewSection — Synopsis text block shown for any media type
 */

import { StyleSheet, Text } from "react-native";
import type { ThemeTokens } from "@/constants/theme";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppColors } from "../../../hooks/useColors";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { sectionStyles } from "./sectionStyles";

interface OverviewSectionProps {
  overview?: string;
}

export function OverviewSection({ overview }: OverviewSectionProps) {
  const styles = useThemedStyles(createStyles);
  if (!overview) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(300)}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <Text style={styles.overview}>{overview}</Text>
    </Animated.View>
  );
}

const createStyles = (colors: AppColors, theme: ThemeTokens) =>
  StyleSheet.create({
    ...sectionStyles(colors, theme),
    overview: {
      ...theme.text("body", "regular"),
      color: colors.textSecondary,
      lineHeight: 24,
    },
  });
