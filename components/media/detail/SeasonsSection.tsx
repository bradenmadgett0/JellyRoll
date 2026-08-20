/**
 * SeasonsSection — Season/episode list for a Series, fetched and grouped internally
 */

import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppColors } from "../../../hooks/useColors";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import {
  useJellyfinEpisodes,
  useJellyfinImageUrl,
  useJellyfinSeasons,
} from "../../../services/hooks/useJellyfin";
import { EpisodeItem, EpisodeList, SeasonGroup } from "../EpisodeList";
import { sectionStyles } from "./sectionStyles";

interface SeasonsSectionProps {
  seriesId: string;
  accentColor: string;
}

const createStyles = (colors: AppColors) => StyleSheet.create({ ...sectionStyles(colors) });

export function SeasonsSection({ seriesId, accentColor }: SeasonsSectionProps) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const getImageUrl = useJellyfinImageUrl();
  const { data: seasons } = useJellyfinSeasons(seriesId);
  const { data: episodes } = useJellyfinEpisodes(seriesId);

  const seasonGroups: SeasonGroup[] = useMemo(() => {
    if (!seasons) return [];
    return seasons.map((season) => ({
      seasonNumber: season.IndexNumber ?? 0,
      totalEpisodes: season.ChildCount,
      episodes: (episodes ?? [])
        .filter((e) => e.SeasonId === season.Id)
        .map(
          (e): EpisodeItem => ({
            id: e.Id,
            episodeNumber: e.IndexNumber ?? 0,
            title: e.Name,
            airDate: e.PremiereDate,
            overview: e.Overview,
            hasFile: true,
            imageUrl: getImageUrl(e.Id, "Primary", 200, e.ImageTags?.Primary) ?? undefined,
            onPress: () => router.push(`/media/${e.Id}` as any),
          }),
        ),
    }));
  }, [seasons, episodes, getImageUrl, router]);

  if (seasonGroups.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(500)}>
      <Text style={styles.sectionTitle}>Seasons ({seasonGroups.length})</Text>
      <EpisodeList seasons={seasonGroups} accentColor={accentColor} />
    </Animated.View>
  );
}
