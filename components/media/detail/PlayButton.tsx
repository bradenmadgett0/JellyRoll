/**
 * PlayButton — Play/Resume button with progress bar for playable items (Movie, Episode)
 */

import { Ionicons } from "@expo/vector-icons";
import type { ThemeTokens } from "@/constants/theme";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Spacing } from "../../../constants/Spacing";
import { AppColors } from "../../../hooks/useColors";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { JellyfinItem } from "../../../types/jellyfin";

function formatResumeTime(ticks: number): string {
  const totalSeconds = Math.floor(ticks / 10_000_000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0)
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface PlayButtonProps {
  item: JellyfinItem;
}

export function PlayButton({ item }: PlayButtonProps) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const positionTicks = item.UserData?.PlaybackPositionTicks ?? 0;
  const isResumable = positionTicks > 0;
  const playedPct = item.UserData?.PlayedPercentage ?? 0;

  return (
    <View>
      <TouchableOpacity
        style={styles.playButton}
        onPress={() =>
          router.push({
            pathname: "/media/player",
            params: {
              itemId: item.Id,
              startTicks: String(positionTicks),
            },
          })
        }
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={22} color={styles.playButtonText.color} />
        <Text style={styles.playButtonText}>
          {isResumable ? `Resume · ${formatResumeTime(positionTicks)}` : "Play"}
        </Text>
      </TouchableOpacity>
      {isResumable && (
        <View style={styles.resumeProgressContainer}>
          <View
            style={[styles.resumeProgressBar, { width: `${Math.min(playedPct, 100)}%` }]}
          />
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: AppColors, theme: ThemeTokens) =>
  StyleSheet.create({
    playButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: Spacing.radiusMd,
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    playButtonText: {
      ...theme.text("title", "semibold"),
      color: colors.textInverse,
    },
    resumeProgressContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: colors.surfaceBorder,
      borderBottomLeftRadius: Spacing.radiusMd,
      borderBottomRightRadius: Spacing.radiusMd,
      overflow: "hidden",
    },
    resumeProgressBar: { height: "100%", backgroundColor: colors.jellyfin },
  });
