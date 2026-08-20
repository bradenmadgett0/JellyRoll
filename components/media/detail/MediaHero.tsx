/**
 * MediaHero — Backdrop image, gradient fade, and back button for the media detail screen
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Spacing } from "../../../constants/Spacing";
import { AppColors } from "../../../hooks/useColors";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { useJellyfinImageUrl } from "../../../services/hooks/useJellyfin";
import { JellyfinItem } from "../../../types/jellyfin";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BACKDROP_HEIGHT = SCREEN_HEIGHT * 0.45;

interface MediaHeroProps {
  item: JellyfinItem;
  onBack: () => void;
}

export function MediaHero({ item, onBack }: MediaHeroProps) {
  const styles = useThemedStyles(createStyles);
  const getImageUrl = useJellyfinImageUrl();

  const backdropUrl = getImageUrl(
    item.ParentBackdropItemId ?? item.Id,
    "Backdrop",
    SCREEN_WIDTH * 2,
    // Only this item's own tag — a parent's backdrop tag isn't in this response.
    item.ParentBackdropItemId ? undefined : item.BackdropImageTags?.[0],
  );

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.heroContainer}>
      {backdropUrl ? (
        <Image source={{ uri: backdropUrl }} style={styles.backdropImage} resizeMode="cover" />
      ) : (
        <View style={[styles.backdropImage, styles.backdropPlaceholder]}>
          <Ionicons name="image" size={48} color={styles.iconTertiary.color} />
        </View>
      )}
      <LinearGradient
        colors={[
          "transparent",
          "rgba(13, 17, 23, 0.4)",
          "rgba(13, 17, 23, 0.9)",
          styles.backgroundColor.color as string,
        ]}
        style={styles.heroGradient}
      />

      <TouchableOpacity style={styles.heroBackButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={styles.iconText.color} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    heroContainer: {
      width: SCREEN_WIDTH,
      height: BACKDROP_HEIGHT,
      position: "relative",
    },
    backdropImage: { width: "100%", height: "100%" },
    backdropPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
      justifyContent: "center",
      alignItems: "center",
    },
    heroGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: BACKDROP_HEIGHT * 0.7,
    },
    heroBackButton: {
      position: "absolute",
      top: 52,
      left: Spacing.screenPadding,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },

    // Color tokens for inline use
    iconTertiary: { color: colors.textTertiary },
    iconText: { color: colors.text },
    backgroundColor: { color: colors.background },
  });
