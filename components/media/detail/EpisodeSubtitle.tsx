/**
 * EpisodeSubtitle — Series name and SxEy label rendered under an episode's title
 */

import { StyleSheet, Text } from "react-native";
import { AppColors } from "../../../hooks/useColors";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { JellyfinItem } from "../../../types/jellyfin";

interface EpisodeSubtitleProps {
  item: JellyfinItem;
}

export function EpisodeSubtitle({ item }: EpisodeSubtitleProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <>
      {item.SeriesName && <Text style={styles.seriesName}>{item.SeriesName}</Text>}
      <Text style={styles.episodeLabel}>
        S{item.ParentIndexNumber ?? 0}E{item.IndexNumber ?? 0}
      </Text>
    </>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    seriesName: {
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      color: colors.jellyfin,
      marginTop: 2,
    },
    episodeLabel: {
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
