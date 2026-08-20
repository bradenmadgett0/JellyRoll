/**
 * MediaTitleBlock — Poster, title, meta line, and rating for the media detail screen.
 * Accepts an optional `subtitle` node for type-specific info rendered under the title
 * (e.g. an Episode's series name and SxEy label).
 */

import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Spacing } from "../../../constants/Spacing";
import { AppColors } from "../../../hooks/useColors";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { useJellyfinImageUrl } from "../../../services/hooks/useJellyfin";
import { JellyfinItem } from "../../../types/jellyfin";

function formatRuntime(ticks?: number): string {
  if (!ticks) return "";
  const minutes = Math.floor(ticks / 600000000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

interface MediaTitleBlockProps {
  item: JellyfinItem;
  subtitle?: ReactNode;
}

export function MediaTitleBlock({ item, subtitle }: MediaTitleBlockProps) {
  const styles = useThemedStyles(createStyles);
  const getImageUrl = useJellyfinImageUrl();

  const posterUrl = getImageUrl(item.Id, "Primary", 300, item.ImageTags?.Primary);
  const yearText = item.ProductionYear ? String(item.ProductionYear) : "";
  const ratingText = item.OfficialRating ?? "";
  const runtimeText = formatRuntime(item.RunTimeTicks);
  const metaItems = [yearText, ratingText, runtimeText].filter(Boolean);

  return (
    <View style={styles.titleRow}>
      {posterUrl && (
        <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
      )}
      <View style={styles.titleInfo}>
        <Text style={styles.title}>{item.Name}</Text>
        {subtitle}
        {metaItems.length > 0 && <Text style={styles.meta}>{metaItems.join(" · ")}</Text>}
        {item.CommunityRating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={styles.ratingText.color} />
            <Text style={styles.ratingText}>{item.CommunityRating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    titleRow: {
      flexDirection: "row",
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    poster: {
      width: 100,
      height: 150,
      borderRadius: Spacing.radiusMd,
      backgroundColor: colors.backgroundTertiary,
    },
    titleInfo: { flex: 1, justifyContent: "flex-end" },
    title: {
      fontFamily: "Inter_700Bold",
      fontSize: 24,
      color: colors.text,
      lineHeight: 30,
    },
    meta: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 6,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 6,
    },
    ratingText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: colors.warning,
    },
  });
