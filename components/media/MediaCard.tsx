/**
 * MediaCard — Poster card with title, progress bar, and badges
 * Used in Home rows, Library grid, and search results
 */

import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Spacing } from "../../constants/Spacing";
import { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface MediaCardProps {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  /** 0–100 playback progress */
  progress?: number;
  /** e.g. "Movie", "Series", "Episode" */
  badge?: string;
  badgeColor?: string;
  year?: number;
  rating?: number;
  onPress?: () => void;
  /**
   * 'poster' = tall card (120×180)
   * 'backdrop' = wide card (220×124)
   * 'grid' = fills grid column
   */
  variant?: "poster" | "backdrop" | "grid";
}

const POSTER_W = Spacing.posterWidth;
const POSTER_H = Spacing.posterHeight;
const BACKDROP_W = 220;
const BACKDROP_H = 124;

function MediaCardBase({
  id,
  title,
  subtitle,
  imageUrl,
  progress,
  badge,
  badgeColor,
  year,
  rating,
  onPress,
  variant = "poster",
}: MediaCardProps) {
  const styles = useThemedStyles(createStyles);
  const isBackdrop = variant === "backdrop";
  const isGrid = variant === "grid";
  const cardW = isBackdrop
    ? BACKDROP_W
    : isGrid
      ? (SCREEN_WIDTH - Spacing.screenPadding * 2 - Spacing.md) / 2
      : POSTER_W;
  const cardH = isBackdrop ? BACKDROP_H : isGrid ? cardW * 1.5 : POSTER_H;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, { width: cardW }]}
    >
      <Animated.View entering={FadeIn.duration(300)}>
        {/* Image */}
        <View style={[styles.imageContainer, { width: cardW, height: cardH }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons
                name={isBackdrop ? "image" : "film"}
                size={32}
                color={styles.iconTertiary.color}
              />
            </View>
          )}

          {/* Progress bar */}
          {progress !== undefined && progress > 0 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
          )}

          {/* Badge */}
          {badge && (
            <View
              style={[
                styles.badge,
                badgeColor ? { backgroundColor: badgeColor } : {},
              ]}
            >
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}

          {/* Rating */}
          {rating !== undefined && rating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons
                name="star"
                size={10}
                color={styles.warningColor.color}
              />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {/* Subtitle / Year */}
        {(subtitle || year) && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle || (year ? String(year) : "")}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export const MediaCard = memo(MediaCardBase);

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      marginRight: Spacing.md,
    },
    imageContainer: {
      borderRadius: Spacing.radiusMd,
      overflow: "hidden",
      backgroundColor: colors.backgroundTertiary,
      marginBottom: Spacing.sm,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    placeholder: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.backgroundTertiary,
    },

    // Progress
    progressContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: colors.surfaceBorder,
    },
    progressBar: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 2,
    },

    // Badge
    badge: {
      position: "absolute",
      top: Spacing.sm,
      left: Spacing.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Spacing.radiusSm,
    },
    badgeText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 9,
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },

    // Rating
    ratingBadge: {
      position: "absolute",
      top: Spacing.sm,
      right: Spacing.sm,
      backgroundColor: "rgba(0,0,0,0.7)",
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Spacing.radiusSm,
    },
    ratingText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      color: colors.text,
    },

    // Text
    title: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      color: colors.text,
      lineHeight: 17,
    },
    subtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Color tokens for inline use
    iconTertiary: { color: colors.textTertiary },
    warningColor: { color: colors.warning },
  });
