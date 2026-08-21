/**
 * MediaInfoSection — Container/bitrate/size and stream details shown for any media type
 */

import { StyleSheet, Text, View } from "react-native";
import type { ThemeTokens } from "@/constants/theme";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Spacing } from "../../../constants/Spacing";
import { AppColors } from "../../../hooks/useColors";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { JellyfinItem } from "../../../types/jellyfin";
import { sectionStyles } from "./sectionStyles";

interface MediaInfoSectionProps {
  mediaSources?: JellyfinItem["MediaSources"];
}

export function MediaInfoSection({ mediaSources }: MediaInfoSectionProps) {
  const styles = useThemedStyles(createStyles);
  if (!mediaSources || mediaSources.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(600)}>
      <Text style={styles.sectionTitle}>Media Info</Text>
      {mediaSources.map((source) => (
        <View key={source.Id} style={styles.mediaInfoCard}>
          <Text style={styles.mediaInfoName}>{source.Name}</Text>
          <View style={styles.mediaInfoRow}>
            {source.Container && (
              <View style={styles.mediaInfoChip}>
                <Text style={styles.mediaInfoChipText}>{source.Container.toUpperCase()}</Text>
              </View>
            )}
            {source.Bitrate && (
              <View style={styles.mediaInfoChip}>
                <Text style={styles.mediaInfoChipText}>
                  {(source.Bitrate / 1e6).toFixed(1)} Mbps
                </Text>
              </View>
            )}
            {source.Size && (
              <View style={styles.mediaInfoChip}>
                <Text style={styles.mediaInfoChipText}>
                  {(source.Size / 1e9).toFixed(1)} GB
                </Text>
              </View>
            )}
          </View>
          {source.MediaStreams?.filter((s) => s.Type === "Video").map((stream) => (
            <Text key={stream.Index} style={styles.mediaStreamText}>
              Video: {stream.DisplayTitle ?? `${stream.Codec} ${stream.Width}×${stream.Height}`}
            </Text>
          ))}
          {source.MediaStreams?.filter((s) => s.Type === "Audio").map((stream) => (
            <Text key={stream.Index} style={styles.mediaStreamText}>
              Audio: {stream.DisplayTitle ?? `${stream.Codec} ${stream.Channels}ch`}
            </Text>
          ))}
        </View>
      ))}
    </Animated.View>
  );
}

const createStyles = (colors: AppColors, theme: ThemeTokens) =>
  StyleSheet.create({
    ...sectionStyles(colors, theme),
    mediaInfoCard: {
      backgroundColor: colors.backgroundTertiary,
      borderRadius: Spacing.radiusMd,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      marginBottom: Spacing.sm,
    },
    mediaInfoName: {
      ...theme.text("bodySmall", "semibold"),
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    mediaInfoRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    mediaInfoChip: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.surfaceHover,
    },
    mediaInfoChipText: {
      ...theme.text("labelSmall", "medium"),
      color: colors.textSecondary,
    },
    mediaStreamText: {
      ...theme.text("label", "regular"),
      color: colors.textTertiary,
      marginTop: 2,
    },
  });
