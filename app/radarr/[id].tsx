/**
 * Radarr Movie Detail
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
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
import { Spacing } from "../../constants/Spacing";
import { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import {
  useRadarrImageUrl,
  useRadarrMovieDetail,
  useRadarrRefresh,
} from "../../services/hooks/useRadarr";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatSize(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

export default function RadarrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const numericId = id ? parseInt(id, 10) : undefined;
  const getImageUrl = useRadarrImageUrl();

  const { data: movie, isLoading } = useRadarrMovieDetail(numericId);
  const refreshMutation = useRadarrRefresh();

  const bannerUrl =
    numericId !== undefined ? getImageUrl(numericId, "fanart") : null;
  const posterUrl =
    numericId !== undefined ? getImageUrl(numericId, "poster") : null;

  const handleRefresh = useCallback(() => {
    if (numericId !== undefined) refreshMutation.mutate(numericId);
  }, [numericId, refreshMutation]);

  if (isLoading || !movie) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Loading..." }} />
        <ActivityIndicator
          size="large"
          color={styles.radarrColor.color as string}
        />
      </View>
    );
  }

  const runtimeHours = Math.floor(movie.runtime / 60);
  const runtimeMins = movie.runtime % 60;
  const runtimeText =
    runtimeHours > 0 ? `${runtimeHours}h ${runtimeMins}m` : `${runtimeMins}m`;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: movie.title,
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
              <Text style={styles.title}>{movie.title}</Text>
              <Text style={styles.meta}>
                {movie.year} · {runtimeText} · {movie.certification ?? "NR"}
              </Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: movie.hasFile
                        ? styles.successColor.color + "20"
                        : styles.missingColor.color + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: movie.hasFile
                          ? (styles.successColor.color as string)
                          : (styles.missingColor.color as string),
                      },
                    ]}
                  >
                    {movie.hasFile ? "Available" : "Missing"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: movie.monitored
                        ? styles.radarrColor.color + "20"
                        : styles.iconTertiary.color + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: movie.monitored
                          ? (styles.radarrColor.color as string)
                          : (styles.iconTertiary.color as string),
                      },
                    ]}
                  >
                    {movie.monitored ? "Monitored" : "Unmonitored"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.statsRow}
        >
          <View style={styles.stat}>
            <Ionicons
              name="calendar"
              size={18}
              color={styles.radarrColor.color}
            />
            <Text style={styles.statValue}>{movie.year}</Text>
            <Text style={styles.statLabel}>Year</Text>
          </View>
          {movie.studio && (
            <View style={styles.stat}>
              <Ionicons
                name="business"
                size={18}
                color={styles.radarrColor.color}
              />
              <Text style={styles.statValue} numberOfLines={1}>
                {movie.studio}
              </Text>
              <Text style={styles.statLabel}>Studio</Text>
            </View>
          )}
          <View style={styles.stat}>
            <Ionicons
              name="server"
              size={18}
              color={styles.radarrColor.color}
            />
            <Text style={styles.statValue}>
              {movie.hasFile ? formatSize(movie.sizeOnDisk) : "--"}
            </Text>
            <Text style={styles.statLabel}>Size</Text>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.actionsRow}
        >
          <TouchableOpacity style={styles.actionBtn} onPress={handleRefresh}>
            <Ionicons
              name="refresh"
              size={20}
              color={styles.radarrColor.color}
            />
            <Text style={styles.actionBtnText}>Refresh</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Overview */}
        {movie.overview && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(300)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.overview}>{movie.overview}</Text>
          </Animated.View>
        )}

        {/* Genres */}
        {movie.genres.length > 0 && (
          <View style={styles.genreRow}>
            {movie.genres.map((g) => (
              <View key={g} style={styles.genreChip}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* File info */}
        {movie.movieFile && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(400)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>File Info</Text>
            <View style={styles.fileCard}>
              <Text style={styles.fileName}>
                {movie.movieFile.relativePath}
              </Text>
              <View style={styles.fileInfoRow}>
                <View style={styles.fileChip}>
                  <Text style={styles.fileChipText}>
                    {formatSize(movie.movieFile.size)}
                  </Text>
                </View>
                {movie.movieFile.quality?.quality?.name && (
                  <View style={styles.fileChip}>
                    <Text style={styles.fileChipText}>
                      {movie.movieFile.quality.quality.name}
                    </Text>
                  </View>
                )}
                {movie.movieFile.mediaInfo?.resolution && (
                  <View style={styles.fileChip}>
                    <Text style={styles.fileChipText}>
                      {movie.movieFile.mediaInfo.resolution}
                    </Text>
                  </View>
                )}
                {movie.movieFile.mediaInfo?.videoCodec && (
                  <View style={styles.fileChip}>
                    <Text style={styles.fileChipText}>
                      {movie.movieFile.mediaInfo.videoCodec}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        )}
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
    stat: { alignItems: "center", gap: 4, maxWidth: 100 },
    statValue: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: colors.text,
      textAlign: "center",
    },
    statLabel: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: colors.textTertiary,
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

    // File info
    fileCard: {
      backgroundColor: colors.backgroundTertiary,
      borderRadius: Spacing.radiusMd,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    fileName: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    fileInfoRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
    fileChip: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.surfaceHover,
    },
    fileChipText: {
      fontFamily: "Inter_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    // Header
    headerBg: { backgroundColor: colors.backgroundSecondary },
    headerTitle: { color: colors.text },

    // Color tokens for inline use
    iconTertiary: { color: colors.textTertiary },
    radarrColor: { color: colors.radarr },
    successColor: { color: colors.success },
    missingColor: { color: colors.badgeMissing },
  });
