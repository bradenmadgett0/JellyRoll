/**
 * StudiosSection — Studio chips shown for any media type
 */

import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Spacing } from "../../../constants/Spacing";
import { AppColors } from "../../../hooks/useColors";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { JellyfinItem } from "../../../types/jellyfin";
import { sectionStyles } from "./sectionStyles";

interface StudiosSectionProps {
  studios?: JellyfinItem["Studios"];
}

export function StudiosSection({ studios }: StudiosSectionProps) {
  const styles = useThemedStyles(createStyles);
  if (!studios || studios.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(500)}>
      <Text style={styles.sectionTitle}>Studios</Text>
      <View style={styles.studioRow}>
        {studios.map((s) => (
          <View key={s.Id} style={styles.studioChip}>
            <Text style={styles.studioText}>{s.Name}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    ...sectionStyles(colors),
    studioRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
    studioChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: Spacing.radiusFull,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    studioText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: colors.textSecondary,
    },
  });
