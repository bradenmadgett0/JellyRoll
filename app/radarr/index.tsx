/**
 * Radarr — Movie list with live data
 */

import { Ionicons } from "@expo/vector-icons";
import type { ThemeTokens } from "@/constants/theme";
import { Stack, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
  useRadarrImageUrl,
  useRadarrMovies,
} from "../../services/hooks/useRadarr";
import { RadarrMovie } from "../../types/radarr";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_COLUMNS = 3;
const CARD_GAP = Spacing.md;
const CARD_WIDTH =
  (SCREEN_WIDTH - Spacing.screenPadding * 2 - CARD_GAP * (GRID_COLUMNS - 1)) /
  GRID_COLUMNS;

type SortMode = "title" | "dateAdded" | "year";
type FilterMode = "all" | "monitored" | "missing" | "available";

export default function RadarrScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { data: movies, isLoading, refetch } = useRadarrMovies();
  const getImageUrl = useRadarrImageUrl();

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("title");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const filteredMovies = useMemo(() => {
    if (!movies) return [];
    let filtered = movies;

    // Filter
    switch (filterMode) {
      case "monitored":
        filtered = filtered.filter((m) => m.monitored);
        break;
      case "missing":
        filtered = filtered.filter((m) => !m.hasFile && m.monitored);
        break;
      case "available":
        filtered = filtered.filter((m) => m.hasFile);
        break;
    }

    // Search
    if (search.length > 0) {
      const term = search.toLowerCase();
      filtered = filtered.filter((m) => m.title.toLowerCase().includes(term));
    }

    // Sort
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
  }, [movies, search, sortMode, filterMode]);

  const renderMovie = useCallback(
    ({ item, index }: { item: RadarrMovie; index: number }) => {
      const posterUrl = getImageUrl(item.id, "poster");
      return (
        <Animated.View
          entering={FadeIn.duration(300).delay(Math.min(index * 25, 300))}
        >
          <TouchableOpacity
            style={[styles.movieCard, { width: CARD_WIDTH }]}
            onPress={() => router.push(`/radarr/${item.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.posterContainer}>
              {posterUrl ? (
                <Image
                  source={{ uri: posterUrl }}
                  style={styles.poster}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.poster, styles.posterPlaceholder]}>
                  <Ionicons
                    name="film"
                    size={28}
                    color={styles.iconTertiary.color}
                  />
                </View>
              )}
              {/* Status badge */}
              {item.hasFile ? (
                <View style={[styles.fileBadge, styles.fileBadgeSuccess]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              ) : item.monitored ? (
                <View style={[styles.fileBadge, styles.fileBadgeMissing]}>
                  <Ionicons name="close" size={10} color="#fff" />
                </View>
              ) : null}
            </View>
            <Text style={styles.movieTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.movieYear}>{item.year}</Text>
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
          title: "Radarr",
          headerStyle: { backgroundColor: styles.headerBg.backgroundColor },
          headerTintColor: styles.headerTitle.color as string,
          headerTitleStyle: styles.headerTitle,
        }}
      />

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={styles.iconTertiary.color} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies..."
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
        <View style={styles.filterRow}>
          {(["all", "monitored", "missing", "available"] as FilterMode[]).map(
            (mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.filterChip,
                  filterMode === mode && styles.filterChipActive,
                ]}
                onPress={() => setFilterMode(mode)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterMode === mode && styles.filterChipTextActive,
                  ]}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator
            size="large"
            color={styles.radarrColor.color as string}
          />
        </View>
      ) : (
        <FlatList
          data={filteredMovies}
          numColumns={GRID_COLUMNS}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMovie}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={styles.radarrColor.color as string}
            />
          }
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {filteredMovies.length} movies
              {search ? ` matching "${search}"` : ""}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="film"
                size={48}
                color={styles.iconTertiary.color}
              />
              <Text style={styles.emptyText}>No movies found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: AppColors, theme: ThemeTokens) =>
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
      ...theme.text("body", "regular"),
      flex: 1,
      color: colors.text,
      paddingVertical: 4,
    },
    filterRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
    filterChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: Spacing.radiusFull,
      backgroundColor: colors.backgroundTertiary,
    },
    filterChipActive: { backgroundColor: colors.radarr },
    filterChipText: {
      ...theme.text("label", "medium"),
      color: colors.textSecondary,
    },
    filterChipTextActive: { color: colors.textInverse },

    // Grid
    gridContent: {
      paddingHorizontal: Spacing.screenPadding,
      paddingBottom: 32,
    },
    gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
    resultCount: {
      ...theme.text("caption", "regular"),
      color: colors.textTertiary,
      paddingVertical: Spacing.sm,
    },

    // Movie card
    movieCard: { overflow: "hidden" },
    posterContainer: {
      position: "relative",
      width: "100%",
      height: CARD_WIDTH * 1.5,
      borderRadius: Spacing.radiusMd,
      overflow: "hidden",
      marginBottom: 6,
    },
    poster: { width: "100%", height: "100%" },
    posterPlaceholder: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.backgroundTertiary,
    },
    fileBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: "center",
      alignItems: "center",
    },
    fileBadgeSuccess: { backgroundColor: colors.success },
    fileBadgeMissing: { backgroundColor: colors.badgeMissing },
    movieTitle: {
      ...theme.text("caption", "medium"),
      color: colors.text,
      lineHeight: 17,
    },
    movieYear: {
      ...theme.text("labelSmall", "regular"),
      color: colors.textTertiary,
      marginTop: 2,
    },

    // Empty/loading
    centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyContainer: { paddingTop: 80, alignItems: "center", gap: Spacing.md },
    emptyText: {
      ...theme.text("body", "regular"),
      color: colors.textTertiary,
    },

    // Header
    headerBg: { backgroundColor: colors.backgroundSecondary },
    headerTitle: { ...theme.text("bodySmall", "semibold"), color: colors.text },

    // Color tokens for inline use
    iconTertiary: { color: colors.textTertiary },
    radarrColor: { color: colors.radarr },
  });
