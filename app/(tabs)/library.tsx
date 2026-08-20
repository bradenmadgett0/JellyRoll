/**
 * Library Screen — Browse Jellyfin media with live data
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { MediaCard } from "../../components/media/MediaCard";
import { TAB_BAR_BOTTOM_INSET } from "../../components/ui/TabSafeView";
import { Spacing } from "../../constants/Spacing";
import { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import {
  useJellyfinImageUrl,
  useJellyfinItems,
  useJellyfinLibraries,
} from "../../services/hooks/useJellyfin";
import { useServerStore } from "../../services/stores/serverStore";
import { JellyfinItem } from "../../types/jellyfin";

const CARD_GAP = Spacing.md;
// Columns are derived from available width, not hardcoded — a card stays at
// least this wide, and the grid fits as many of them as will fully fit
// (never fewer than 2), so it wraps naturally on phones, tablets, and
// split-screen/foldable widths alike instead of being fixed at 3.
const MIN_CARD_WIDTH = 110;

// Distinct from `undefined` (which means "no chip picked yet" — before this
// existed, the "All" chip's Id was undefined too, indistinguishable from
// that initial state, so selecting it just fell back to the "pick a
// library" prompt and the query was never even enabled for it.
const ALL_LIBRARIES = "all";

const LIBRARY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  movies: "film",
  tvshows: "tv",
  music: "musical-notes",
  books: "book",
  photos: "images",
  playlists: "list",
  boxsets: "albums",
};

// The server always answers /Items with Recursive=true (see jellyfin.ts),
// so browsing a library without an explicit IncludeItemTypes filter returns
// every descendant, not just the library's own top-level browsable items —
// confirmed live: the "Shows" library returned Series *and* every Season
// under them (6,508 items total, dominated by repeated "Season 1" entries
// with no series context), which is exactly why seasons were showing up in
// the grid as if they were shows, and why their "detail" screen had no
// episodes to show — it's a season's own detail, not a series'. "Collections"
// showed the same pattern on a smaller scale (a stray Folder item). Movies
// and Music/Books/Photos weren't independently confirmed against live data
// (no such libraries existed on the server this was checked against), but
// they're the same recursive-without-a-filter query, so they get the same
// treatment based on Jellyfin's own canonical top-level type per collection.
const LIBRARY_ITEM_TYPES: Record<string, string> = {
  movies: "Movie",
  tvshows: "Series",
  music: "MusicAlbum",
  books: "Book",
  boxsets: "BoxSet",
  playlists: "Playlist",
  photos: "Photo,PhotoAlbum",
};

export default function LibraryScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const servers = useServerStore((s) => s.servers);
  const jellyfinServers = servers.filter((s) => s.type === "jellyfin");
  const hasJellyfin = jellyfinServers.length > 0;
  const getImageUrl = useJellyfinImageUrl();

  const [selectedLibraryId, setSelectedLibraryId] = useState<
    string | undefined
  >(ALL_LIBRARIES);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Reactive to rotation/window resize (unlike a one-time Dimensions.get()),
  // so a tablet, foldable, or split-screen window recomputes column count
  // instead of staying fixed at whatever it was on first render.
  const { width: windowWidth } = useWindowDimensions();
  const { columns: gridColumns, cardWidth: CARD_WIDTH } = useMemo(() => {
    const available = windowWidth - Spacing.screenPadding * 2;
    const columns = Math.max(
      2,
      Math.floor((available + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP)),
    );
    const cardWidth = (available - CARD_GAP * (columns - 1)) / columns;
    return { columns, cardWidth };
  }, [windowWidth]);

  const {
    data: libraries,
    isLoading: libLoading,
    refetch: refetchLibs,
  } = useJellyfinLibraries();

  const isAllSelected = selectedLibraryId === ALL_LIBRARIES;
  const selectedLibrary = libraries?.find((lib) => lib.Id === selectedLibraryId);

  const {
    data: itemsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useJellyfinItems({
    // "All" has no parentId (searches the whole library, already Recursive
    // server-side) and is scoped to Movies + Shows specifically, not every
    // item type (music, photos, books, etc.). A specific library is scoped
    // to its own canonical top-level type (see LIBRARY_ITEM_TYPES) — without
    // this, the recursive query returns every descendant (Seasons, Episodes,
    // ...), not just the library's own browsable items.
    parentId: isAllSelected ? undefined : selectedLibraryId,
    includeItemTypes: isAllSelected
      ? "Movie,Series"
      : LIBRARY_ITEM_TYPES[selectedLibrary?.CollectionType ?? ""],
    enabled: !!selectedLibraryId,
  });

  const items = useMemo(() => {
    return itemsData?.pages.flatMap((page) => page.Items) ?? [];
  }, [itemsData]);

  const totalCount = itemsData?.pages[0]?.TotalRecordCount ?? 0;

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchLibs(), refetchItems()]);
  }, [refetchLibs, refetchItems]);

  const renderItem = useCallback(
    ({ item, index }: { item: JellyfinItem; index: number }) => {
      const imageUrl = getImageUrl(
        item.Id,
        "Primary",
        200,
        item.ImageTags?.Primary,
      );
      return (
        <Animated.View
          entering={FadeIn.duration(300).delay(Math.min(index * 30, 300))}
        >
          <TouchableOpacity
            onPress={() => router.push(`/media/${item.Id}`)}
            style={[styles.gridItem, { width: CARD_WIDTH }]}
            activeOpacity={0.7}
          >
            <MediaCard
              id={item.Id}
              title={item.Name}
              imageUrl={imageUrl}
              year={item.ProductionYear}
              rating={item.CommunityRating}
              badge={
                item.Type === "Movie"
                  ? undefined
                  : item.Type === "Series"
                    ? "Series"
                    : undefined
              }
              variant="grid"
              width={CARD_WIDTH}
              onPress={() => router.push(`/media/${item.Id}`)}
            />
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [getImageUrl, router, styles, CARD_WIDTH],
  );

  // Empty state
  if (!hasJellyfin) {
    return (
      <View style={styles.emptyContainer}>
        <Animated.View
          entering={FadeInDown.duration(800)}
          style={styles.emptyContent}
        >
          <Ionicons
            name="library"
            size={64}
            color={styles.iconTertiary.color}
          />
          <Text style={styles.emptyTitle}>No Library Connected</Text>
          <Text style={styles.emptySubtitle}>
            Add a Jellyfin server to browse your media library.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/server/add")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add-circle"
              size={20}
              color={styles.addButtonText.color}
            />
            <Text style={styles.addButtonText}>Add Jellyfin Server</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Library picker */}
      {libLoading ? (
        <View style={styles.libPickerLoading}>
          <ActivityIndicator
            size="small"
            color={styles.iconPrimary.color as string}
          />
        </View>
      ) : (
        <Animated.View entering={FadeInDown.duration(400)}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.libPicker}
            data={[
              { Id: ALL_LIBRARIES, Name: "All", CollectionType: undefined },
              ...(libraries ?? []),
            ]}
            keyExtractor={(item) => item.Id ?? "all"}
            renderItem={({ item }) => {
              const isSelected = item.Id === selectedLibraryId;
              const iconName =
                LIBRARY_ICONS[item.CollectionType ?? ""] ?? "folder";
              return (
                <TouchableOpacity
                  style={[styles.libChip, isSelected && styles.libChipSelected]}
                  onPress={() => setSelectedLibraryId(item.Id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={iconName}
                    size={16}
                    color={
                      isSelected
                        ? (styles.libChipTextSelected.color as string)
                        : (styles.libChipText.color as string)
                    }
                  />
                  <Text
                    style={[
                      styles.libChipText,
                      isSelected && styles.libChipTextSelected,
                    ]}
                  >
                    {item.Name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>
      )}

      {/* Toolbar */}
      {selectedLibraryId && (
        <View style={styles.toolbar}>
          <Text style={styles.resultCount}>
            {totalCount > 0 ? `${totalCount} items` : ""}
          </Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity onPress={() => setViewMode("grid")}>
              <Ionicons
                name="grid"
                size={20}
                color={
                  viewMode === "grid"
                    ? (styles.iconPrimary.color as string)
                    : (styles.iconTertiary.color as string)
                }
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode("list")}>
              <Ionicons
                name="list"
                size={20}
                color={
                  viewMode === "list"
                    ? (styles.iconPrimary.color as string)
                    : (styles.iconTertiary.color as string)
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Items grid */}
      {itemsLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator
            size="large"
            color={styles.iconPrimary.color as string}
          />
          <Text style={styles.loadingText}>Loading library...</Text>
        </View>
      ) : !selectedLibraryId ? (
        <View style={styles.centerLoading}>
          <Ionicons name="albums" size={48} color={styles.iconTertiary.color} />
          <Text style={styles.pickLibText}>
            Select a library above to browse
          </Text>
        </View>
      ) : (
        <FlatList
          // FlatList can't change numColumns on a live instance — remount
          // when the computed column count changes (e.g. rotation, window
          // resize) by keying on it.
          key={gridColumns}
          data={items}
          numColumns={gridColumns}
          keyExtractor={(item) => item.Id}
          renderItem={renderItem}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={onRefresh}
              tintColor={styles.iconPrimary.color as string}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color={styles.iconPrimary.color as string}
                style={{ paddingVertical: 20 }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centerLoading}>
              <Ionicons
                name="folder-open"
                size={48}
                color={styles.iconTertiary.color}
              />
              <Text style={styles.pickLibText}>This library is empty</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Library picker
    libPicker: {
      paddingHorizontal: Spacing.screenPadding,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
    },
    libPickerLoading: {
      height: 56,
      justifyContent: "center",
      alignItems: "center",
    },
    libChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: Spacing.radiusFull,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    libChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    libChipText: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      color: colors.textSecondary,
    },
    libChipTextSelected: { color: colors.textInverse },

    // Toolbar
    toolbar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.screenPadding,
      paddingBottom: Spacing.sm,
    },
    resultCount: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.textTertiary,
    },
    viewToggle: { flexDirection: "row", gap: Spacing.lg },

    // Grid
    gridContent: {
      paddingHorizontal: Spacing.screenPadding,
      paddingBottom: TAB_BAR_BOTTOM_INSET,
    },
    gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
    gridItem: { marginRight: 0 },

    // Loading/empty
    centerLoading: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 80,
      gap: Spacing.md,
    },
    loadingText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: colors.textSecondary,
    },
    pickLibText: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: colors.textTertiary,
      textAlign: "center",
    },

    // Empty state
    emptyContainer: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    emptyContent: { alignItems: "center", gap: Spacing.md },
    emptyTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 22,
      color: colors.text,
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.jellyfin,
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.md,
      borderRadius: Spacing.radiusFull,
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    addButtonText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: colors.textInverse,
    },

    // Color tokens for inline use
    iconPrimary: { color: colors.primary },
    iconTertiary: { color: colors.textTertiary },
  });
