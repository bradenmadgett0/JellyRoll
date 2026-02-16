/**
 * Sonarr — Series list with live data
 */

import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Spacing } from "../../constants/Spacing";
import { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import {
  useSonarrImageUrl,
  useSonarrSeries,
} from "../../services/hooks/useSonarr";
import { SonarrSeries } from "../../types/sonarr";

type SortMode = "title" | "dateAdded" | "year";

export default function SonarrScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { data: series, isLoading, refetch } = useSonarrSeries();
  const getImageUrl = useSonarrImageUrl();

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("title");

  const filteredSeries = useMemo(() => {
    if (!series) return [];
    let filtered = series;
    if (search.length > 0) {
      const term = search.toLowerCase();
      filtered = filtered.filter((s) => s.title.toLowerCase().includes(term));
    }
    return [...filtered].sort((a, b) => {
      switch (sortMode) {
        case "dateAdded":
          return new Date(b.added).getTime() - new Date(a.added).getTime();
        case "year":
          return b.year - a.year;
        default:
          return a.sortTitle.localeCompare(b.sortTitle);
      }
    });
  }, [series, search, sortMode]);

  const renderSeries = useCallback(
    ({ item, index }: { item: SonarrSeries; index: number }) => {
      const posterUrl = getImageUrl(item.id, "poster");
      const stats = item.statistics;
      const episodeProgress = stats
        ? stats.episodeCount > 0
          ? (stats.episodeFileCount / stats.episodeCount) * 100
          : 0
        : 0;

      return (
        <Animated.View
          entering={FadeIn.duration(300).delay(Math.min(index * 40, 400))}
        >
          <TouchableOpacity
            style={styles.seriesCard}
            onPress={() => router.push(`/sonarr/${item.id}` as any)}
            activeOpacity={0.7}
          >
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={styles.poster}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.poster, styles.posterPlaceholder]}>
                <Ionicons
                  name="tv"
                  size={24}
                  color={styles.iconTertiary.color}
                />
              </View>
            )}
            <View style={styles.seriesInfo}>
              <Text style={styles.seriesTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.seriesMeta}>
                {item.year} · {item.network ?? "Unknown"} · {item.status}
              </Text>
              {stats && (
                <View style={styles.progressRow}>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${episodeProgress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {stats.episodeFileCount}/{stats.episodeCount}
                  </Text>
                </View>
              )}
              <View style={styles.tagsRow}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: item.monitored
                        ? styles.successColor.color + "20"
                        : styles.iconTertiary.color + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: item.monitored
                          ? (styles.successColor.color as string)
                          : (styles.iconTertiary.color as string),
                      },
                    ]}
                  >
                    {item.monitored ? "Monitored" : "Unmonitored"}
                  </Text>
                </View>
                {item.status === "continuing" && (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: styles.sonarrColor.color + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: styles.sonarrColor.color as string },
                      ]}
                    >
                      Continuing
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={styles.iconTertiary.color}
            />
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [getImageUrl, router, styles],
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Sonarr",
          headerStyle: { backgroundColor: styles.headerBg.backgroundColor },
          headerTintColor: styles.headerTitle.color as string,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        }}
      />

      {/* Search + Sort */}
      <View style={styles.toolbar}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={styles.iconTertiary.color} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search series..."
            placeholderTextColor={styles.iconTertiary.color as string}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={styles.iconTertiary.color}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sortRow}>
          {(["title", "dateAdded", "year"] as SortMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.sortChip,
                sortMode === mode && styles.sortChipActive,
              ]}
              onPress={() => setSortMode(mode)}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortMode === mode && styles.sortChipTextActive,
                ]}
              >
                {mode === "dateAdded"
                  ? "Added"
                  : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator
            size="large"
            color={styles.sonarrColor.color as string}
          />
        </View>
      ) : (
        <FlatList
          data={filteredSeries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSeries}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={styles.sonarrColor.color as string}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="tv" size={48} color={styles.iconTertiary.color} />
              <Text style={styles.emptyText}>
                {search ? "No series match your search" : "No series in Sonarr"}
              </Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {filteredSeries.length} series
              {search ? ` matching "${search}"` : ""}
            </Text>
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Toolbar
    toolbar: {
      paddingHorizontal: Spacing.screenPadding,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundTertiary,
      borderRadius: Spacing.radiusMd,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: colors.text,
      paddingVertical: 4,
    },
    sortRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
    sortChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: Spacing.radiusFull,
      backgroundColor: colors.backgroundTertiary,
    },
    sortChipActive: { backgroundColor: colors.sonarr },
    sortChipText: {
      fontFamily: "Inter_500Medium",
      fontSize: 12,
      color: colors.textSecondary,
    },
    sortChipTextActive: { color: colors.textInverse },

    // List
    listContent: { paddingBottom: 32 },
    resultCount: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.textTertiary,
      paddingHorizontal: Spacing.screenPadding,
      paddingVertical: Spacing.sm,
    },

    // Series card
    seriesCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.screenPadding,
      paddingVertical: Spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.surfaceBorder,
    },
    poster: {
      width: 56,
      height: 84,
      borderRadius: Spacing.radiusSm,
      backgroundColor: colors.backgroundTertiary,
    },
    posterPlaceholder: { justifyContent: "center", alignItems: "center" },
    seriesInfo: { flex: 1, marginHorizontal: Spacing.md },
    seriesTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: colors.text,
    },
    seriesMeta: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      textTransform: "capitalize",
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      marginTop: 6,
    },
    progressBarContainer: {
      flex: 1,
      height: 4,
      backgroundColor: colors.surfaceBorder,
      borderRadius: 2,
    },
    progressBar: {
      height: "100%",
      backgroundColor: colors.sonarr,
      borderRadius: 2,
    },
    progressText: {
      fontFamily: "Inter_500Medium",
      fontSize: 11,
      color: colors.textTertiary,
      width: 40,
    },
    tagsRow: { flexDirection: "row", gap: Spacing.sm, marginTop: 6 },
    statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    statusText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },

    // Empty/loading
    centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyContainer: { paddingTop: 80, alignItems: "center", gap: Spacing.md },
    emptyText: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: colors.textTertiary,
    },

    // Header
    headerBg: { backgroundColor: colors.backgroundSecondary },
    headerTitle: { color: colors.text },

    // Color tokens for inline use
    iconTertiary: { color: colors.textTertiary },
    sonarrColor: { color: colors.sonarr },
    successColor: { color: colors.success },
  });
