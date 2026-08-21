/**
 * CastSection — Horizontal scroll of actors shown for any media type
 */

import { Ionicons } from "@expo/vector-icons";
import type { ThemeTokens } from "@/constants/theme";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Spacing } from "../../../constants/Spacing";
import { AppColors } from "../../../hooks/useColors";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { useJellyfinImageUrl } from "../../../services/hooks/useJellyfin";
import { JellyfinItem } from "../../../types/jellyfin";
import { sectionStyles } from "./sectionStyles";

interface CastSectionProps {
  people?: JellyfinItem["People"];
}

export function CastSection({ people }: CastSectionProps) {
  const styles = useThemedStyles(createStyles);
  const getImageUrl = useJellyfinImageUrl();

  const actors = people?.filter((p) => p.Type === "Actor").slice(0, 15) ?? [];
  if (actors.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(400)}>
      <Text style={styles.sectionTitle}>Cast & Crew</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.castScroll}>
        {actors.map((person) => {
          const personImage = person.PrimaryImageTag
            ? getImageUrl(person.Id, "Primary", 100, person.PrimaryImageTag)
            : null;
          return (
            <View key={person.Id + (person.Role ?? "")} style={styles.castCard}>
              {personImage ? (
                <Image source={{ uri: personImage }} style={styles.castImage} />
              ) : (
                <View style={[styles.castImage, styles.castImagePlaceholder]}>
                  <Ionicons name="person" size={18} color={styles.iconTertiary.color} />
                </View>
              )}
              <Text style={styles.castName} numberOfLines={1}>
                {person.Name}
              </Text>
              {person.Role && (
                <Text style={styles.castRole} numberOfLines={1}>
                  {person.Role}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (colors: AppColors, theme: ThemeTokens) =>
  StyleSheet.create({
    ...sectionStyles(colors, theme),
    castScroll: { marginBottom: Spacing.md },
    castCard: { width: 72, marginRight: Spacing.md, alignItems: "center" },
    castImage: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.backgroundTertiary,
      marginBottom: 6,
    },
    castImagePlaceholder: { justifyContent: "center", alignItems: "center" },
    castName: {
      ...theme.text("labelSmall", "medium"),
      color: colors.text,
      textAlign: "center",
    },
    castRole: {
      ...theme.text("micro", "regular"),
      color: colors.textTertiary,
      textAlign: "center",
    },
    iconTertiary: { color: colors.textTertiary },
  });
