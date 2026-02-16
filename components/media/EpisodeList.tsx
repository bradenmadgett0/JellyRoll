/**
 * EpisodeList — Collapsible season/episode list
 * Used in Sonarr series detail and Jellyfin TV series
 */

import { Ionicons } from "@expo/vector-icons";
import { memo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Spacing } from "../../constants/Spacing";
import { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";

export interface EpisodeItem {
  id: string | number;
  episodeNumber: number;
  title: string;
  airDate?: string;
  overview?: string;
  hasFile: boolean;
  monitored?: boolean;
  progress?: number;
  onPress?: () => void;
  onSearch?: () => void;
}

export interface SeasonGroup {
  seasonNumber: number;
  episodes: EpisodeItem[];
  episodeFileCount?: number;
  totalEpisodes?: number;
}

interface EpisodeListProps {
  seasons: SeasonGroup[];
  accentColor?: string;
}

function SeasonSection({
  season,
  accentColor,
  styles,
}: {
  season: SeasonGroup;
  accentColor: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const [expanded, setExpanded] = useState(season.seasonNumber === 1);

  const fileCount =
    season.episodeFileCount ?? season.episodes.filter((e) => e.hasFile).length;
  const totalCount = season.totalEpisodes ?? season.episodes.length;
  const progressPercent = totalCount > 0 ? (fileCount / totalCount) * 100 : 0;

  return (
    <View style={styles.seasonContainer}>
      <TouchableOpacity
        style={styles.seasonHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.seasonLeft}>
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-forward"}
            size={18}
            color={styles.iconSecondary.color}
          />
          <Text style={styles.seasonTitle}>
            {season.seasonNumber === 0
              ? "Specials"
              : `Season ${season.seasonNumber}`}
          </Text>
        </View>
        <View style={styles.seasonRight}>
          <Text style={styles.episodeCount}>
            {fileCount}/{totalCount}
          </Text>
          <View style={styles.miniProgress}>
            <View
              style={[
                styles.miniProgressBar,
                { width: `${progressPercent}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.episodesList}>
          {season.episodes.map((episode, index) => (
            <Animated.View
              key={episode.id}
              entering={FadeInDown.duration(200).delay(index * 30)}
            >
              <TouchableOpacity
                style={styles.episodeRow}
                onPress={episode.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.episodeNumber}>
                  <Text
                    style={[
                      styles.episodeNumberText,
                      episode.hasFile && { color: accentColor },
                    ]}
                  >
                    {episode.episodeNumber}
                  </Text>
                </View>
                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeTitle} numberOfLines={1}>
                    {episode.title}
                  </Text>
                  {episode.airDate && (
                    <Text style={styles.episodeAirDate}>{episode.airDate}</Text>
                  )}
                  {episode.progress !== undefined && episode.progress > 0 && (
                    <View style={styles.episodeProgress}>
                      <View
                        style={[
                          styles.episodeProgressBar,
                          { width: `${episode.progress}%` },
                        ]}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.episodeStatus}>
                  {episode.hasFile ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={styles.successColor.color}
                    />
                  ) : episode.monitored !== false ? (
                    <Ionicons
                      name="arrow-down-circle-outline"
                      size={18}
                      color={styles.iconTertiary.color}
                    />
                  ) : (
                    <Ionicons
                      name="remove-circle-outline"
                      size={18}
                      color={styles.iconTertiary.color}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

function EpisodeListBase({ seasons, accentColor }: EpisodeListProps) {
  const styles = useThemedStyles(createStyles);
  const resolvedAccent = accentColor ?? (styles.sonarrColor.color as string);

  return (
    <View>
      {seasons.map((season) => (
        <SeasonSection
          key={season.seasonNumber}
          season={season}
          accentColor={resolvedAccent}
          styles={styles}
        />
      ))}
    </View>
  );
}

export const EpisodeList = memo(EpisodeListBase);

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    seasonContainer: {
      marginBottom: Spacing.sm,
    },
    seasonHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.backgroundTertiary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: Spacing.radiusMd,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    seasonLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    seasonTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: colors.text,
    },
    seasonRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    episodeCount: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: colors.textSecondary,
    },
    miniProgress: {
      width: 40,
      height: 4,
      backgroundColor: colors.surfaceBorder,
      borderRadius: 2,
    },
    miniProgressBar: {
      height: "100%",
      borderRadius: 2,
    },

    // Episodes
    episodesList: {
      paddingLeft: Spacing.md,
    },
    episodeRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.surfaceBorder,
    },
    episodeNumber: {
      width: 32,
      alignItems: "center",
    },
    episodeNumberText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: colors.textTertiary,
    },
    episodeInfo: {
      flex: 1,
      marginHorizontal: Spacing.md,
    },
    episodeTitle: {
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      color: colors.text,
    },
    episodeAirDate: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 2,
    },
    episodeProgress: {
      height: 2,
      backgroundColor: colors.surfaceBorder,
      borderRadius: 1,
      marginTop: 4,
    },
    episodeProgressBar: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 1,
    },
    episodeStatus: {
      width: 28,
      alignItems: "center",
    },

    // Color tokens for inline use
    iconSecondary: { color: colors.textSecondary },
    iconTertiary: { color: colors.textTertiary },
    successColor: { color: colors.success },
    sonarrColor: { color: colors.sonarr },
  });
