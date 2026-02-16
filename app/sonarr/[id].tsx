/**
 * Sonarr Series Detail — episodes, seasons, actions
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { EpisodeList, SeasonGroup } from "../../components/media/EpisodeList";
import { Spacing } from "../../constants/Spacing";
import { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import {
  useSonarrEpisodes,
  useSonarrImageUrl,
  useSonarrRefresh,
  useSonarrSeriesDetail,
} from "../../services/hooks/useSonarr";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatSize(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

export default function SonarrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const numericId = id ? parseInt(id, 10) : undefined;
  const getImageUrl = useSonarrImageUrl();

  const { data: series, isLoading } = useSonarrSeriesDetail(numericId);
  const { data: episodes } = useSonarrEpisodes(numericId);
  const refreshMutation = useSonarrRefresh();

  const bannerUrl =
    numericId !== undefined ? getImageUrl(numericId, "fanart") : null;
  const posterUrl =
    numericId !== undefined ? getImageUrl(numericId, "poster") : null;

  // Group episodes by season
  const seasonGroups: SeasonGroup[] = useMemo(() => {
    if (!episodes || !series) return [];

    const grouped = new Map<number, SeasonGroup>();

    series.seasons.forEach((season) => {
      grouped.set(season.seasonNumber, {
        seasonNumber: season.seasonNumber,
        episodes: [],
        episodeFileCount: season.statistics?.episodeFileCount ?? 0,
        totalEpisodes: season.statistics?.totalEpisodeCount ?? 0,
      });
    });

    episodes.forEach((ep) => {
      const group = grouped.get(ep.seasonNumber);
      if (group) {
        group.episodes.push({
          id: ep.id,
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          airDate: ep.airDate ?? undefined,
          overview: ep.overview ?? undefined,
          hasFile: ep.hasFile,
          monitored: ep.monitored,
        });
      }
    });

    return Array.from(grouped.values()).sort(
      (a, b) => a.seasonNumber - b.seasonNumber,
    );
  }, [episodes, series]);

  const handleRefresh = useCallback(() => {
    if (numericId !== undefined) {
      refreshMutation.mutate(numericId);
    }
  }, [numericId, refreshMutation]);

  if (isLoading || !series) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Loading..." }} />
        <ActivityIndicator
          size="large"
          color={styles.sonarrColor.color as string}
        />
      </View>
    );
  }

  const stats = series.statistics;
  const totalSize = stats ? formatSize(stats.sizeOnDisk) : "--";
  const progress =
    stats && stats.episodeCount > 0
      ? Math.round((stats.episodeFileCount / stats.episodeCount) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: series.title,
          headerStyle: { backgroundColor: styles.headerBg.backgroundColor },
          headerTintColor: styles.headerTitle.color as string,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        }}
      />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Hero */}
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.heroContainer}
        >
          {bannerUrl ? (
            <Image
              source={{ uri: bannerUrl }}
              style={styles.banner}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.banner, styles.bannerPlaceholder]} />
          )}
          <LinearGradient
            colors={[
              "transparent",
              "rgba(13,17,23,0.8)",
              styles.container.backgroundColor as string,
            ]}
            style={styles.heroGradient}
          />

          <View style={styles.heroContent}>
            {posterUrl && (
              <Image
                source={{ uri: posterUrl }}
                style={styles.poster}
                resizeMode="cover"
              />
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.title}>{series.title}</Text>
              <Text style={styles.meta}>
                {series.year} · {series.network ?? ""} · {series.runtime}min
              </Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: series.monitored
                        ? styles.successColor.color + "20"
                        : styles.iconTertiary.color + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: series.monitored
                          ? (styles.successColor.color as string)
                          : (styles.iconTertiary.color as string),
                      },
                    ]}
                  >
                    {series.monitored ? "Monitored" : "Unmonitored"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: styles.sonarrColor.color + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: styles.sonarrColor.color as string },
                    ]}
                  >
                    {series.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.statsRow}
        >
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats?.seasonCount ?? 0}</Text>
            <Text style={styles.statLabel}>Seasons</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {stats?.episodeFileCount ?? 0}/{stats?.episodeCount ?? 0}
            </Text>
            <Text style={styles.statLabel}>Episodes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{progress}%</Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalSize}</Text>
            <Text style={styles.statLabel}>Size</Text>
          </View>
        </Animated.View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>

        {/* Action buttons */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.actionsRow}
        >
          <TouchableOpacity style={styles.actionBtn} onPress={handleRefresh}>
            <Ionicons
              name="refresh"
              size={20}
              color={styles.sonarrColor.color}
            />
            <Text style={styles.actionBtnText}>Refresh</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Overview */}
        {series.overview && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(300)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.overview}>{series.overview}</Text>
          </Animated.View>
        )}

        {/* Genres */}
        {series.genres.length > 0 && (
          <View style={styles.genreRow}>
            {series.genres.map((g) => (
              <View key={g} style={styles.genreChip}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Seasons & Episodes */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(400)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Seasons & Episodes</Text>
          <EpisodeList
            seasons={seasonGroups}
            accentColor={styles.sonarrColor.color as string}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { paddingBottom: 40 },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },

    // Hero
    heroContainer: { width: SCREEN_WIDTH, height: 260, position: "relative" },
    banner: { width: "100%", height: "100%" },
    bannerPlaceholder: { backgroundColor: colors.backgroundSecondary },
    heroGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 180,
    },
    heroContent: {
      position: "absolute",
      bottom: Spacing.lg,
      left: Spacing.screenPadding,
      right: Spacing.screenPadding,
      flexDirection: "row",
      gap: Spacing.md,
    },
    poster: { width: 80, height: 120, borderRadius: Spacing.radiusSm },
    heroInfo: { flex: 1, justifyContent: "flex-end" },
    title: { fontFamily: "Inter_700Bold", fontSize: 22, color: colors.text },
    meta: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
      textTransform: "capitalize",
    },
    statusRow: { flexDirection: "row", gap: Spacing.sm, marginTop: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },

    // Stats
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: Spacing.lg,
      marginHorizontal: Spacing.screenPadding,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    stat: { alignItems: "center" },
    statValue: {
      fontFamily: "Inter_700Bold",
      fontSize: 18,
      color: colors.sonarr,
    },
    statLabel: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 2,
    },

    // Progress
    progressContainer: {
      height: 4,
      backgroundColor: colors.surfaceBorder,
      marginHorizontal: Spacing.screenPadding,
      borderRadius: 2,
      marginTop: Spacing.md,
    },
    progressBar: {
      height: "100%",
      backgroundColor: colors.sonarr,
      borderRadius: 2,
    },

    // Actions
    actionsRow: {
      flexDirection: "row",
      paddingHorizontal: Spacing.screenPadding,
      marginTop: Spacing.lg,
      gap: Spacing.md,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.backgroundTertiary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: Spacing.radiusMd,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    actionBtnText: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      color: colors.text,
    },

    // Sections
    section: {
      paddingHorizontal: Spacing.screenPadding,
      marginTop: Spacing.xxl,
    },
    sectionTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 18,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    overview: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 24,
    },
    genreRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
      paddingHorizontal: Spacing.screenPadding,
      marginTop: Spacing.md,
    },
    genreChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: Spacing.radiusFull,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    genreText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: colors.textSecondary,
    },

    // Header
    headerBg: { backgroundColor: colors.backgroundSecondary },
    headerTitle: { color: colors.text },

    // Color tokens for inline use
    iconTertiary: { color: colors.textTertiary },
    sonarrColor: { color: colors.sonarr },
    successColor: { color: colors.success },
  });
