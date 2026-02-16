/**
 * Lidarr — Artist list with live data
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
  useLidarrArtists,
  useLidarrImageUrl,
} from "../../services/hooks/useLidarr";
import { LidarrArtist } from "../../types/lidarr";

export default function LidarrScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { data: artists, isLoading, refetch } = useLidarrArtists();
  const getImageUrl = useLidarrImageUrl();

  const [search, setSearch] = useState("");

  const filteredArtists = useMemo(() => {
    if (!artists) return [];
    let filtered = artists;
    if (search.length > 0) {
      const term = search.toLowerCase();
      filtered = filtered.filter((a) =>
        a.artistName.toLowerCase().includes(term),
      );
    }
    return [...filtered].sort((a, b) => a.sortName.localeCompare(b.sortName));
  }, [artists, search]);

  const renderArtist = useCallback(
    ({ item, index }: { item: LidarrArtist; index: number }) => {
      const imageUrl = getImageUrl(item.id, "poster");
      const stats = item.statistics;

      return (
        <Animated.View
          entering={FadeIn.duration(300).delay(Math.min(index * 40, 400))}
        >
          <TouchableOpacity
            style={styles.artistCard}
            onPress={() => router.push(`/lidarr/${item.id}` as any)}
            activeOpacity={0.7}
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.artistImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.artistImage, styles.imagePlaceholder]}>
                <Ionicons
                  name="person"
                  size={24}
                  color={styles.iconTertiary.color}
                />
              </View>
            )}
            <View style={styles.artistInfo}>
              <Text style={styles.artistName} numberOfLines={1}>
                {item.artistName}
              </Text>
              {item.artistType && (
                <Text style={styles.artistType}>{item.artistType}</Text>
              )}
              {stats && (
                <View style={styles.statsRow}>
                  <Text style={styles.statText}>
                    <Ionicons
                      name="disc"
                      size={11}
                      color={styles.lidarrColor.color}
                    />{" "}
                    {stats.albumCount ?? 0} albums
                  </Text>
                  <Text style={styles.statText}>
                    <Ionicons
                      name="musical-note"
                      size={11}
                      color={styles.iconTertiary.color}
                    />{" "}
                    {stats.trackFileCount ?? 0}/{stats.trackCount ?? 0} tracks
                  </Text>
                </View>
              )}
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: item.monitored
                        ? styles.successColor.color + "20"
                        : styles.iconTertiary.color + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
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
          title: "Lidarr",
          headerStyle: { backgroundColor: styles.headerBg.backgroundColor },
          headerTintColor: styles.headerTitle.color as string,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        }}
      />

      {/* Search */}
      <View style={styles.toolbar}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={styles.iconTertiary.color} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artists..."
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
      </View>

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator
            size="large"
            color={styles.lidarrColor.color as string}
          />
        </View>
      ) : (
        <FlatList
          data={filteredArtists}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderArtist}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={styles.lidarrColor.color as string}
            />
          }
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {filteredArtists.length} artists
              {search ? ` matching "${search}"` : ""}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="musical-notes"
                size={48}
                color={styles.iconTertiary.color}
              />
              <Text style={styles.emptyText}>No artists in Lidarr</Text>
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

    listContent: { paddingBottom: 32 },
    resultCount: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.textTertiary,
      paddingHorizontal: Spacing.screenPadding,
      paddingVertical: Spacing.sm,
    },

    artistCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.screenPadding,
      paddingVertical: Spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.surfaceBorder,
    },
    artistImage: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.backgroundTertiary,
    },
    imagePlaceholder: { justifyContent: "center", alignItems: "center" },
    artistInfo: { flex: 1, marginHorizontal: Spacing.md },
    artistName: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: colors.text,
    },
    artistType: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    statsRow: { flexDirection: "row", gap: Spacing.lg, marginTop: 4 },
    statText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: colors.textSecondary,
    },
    badgeRow: { flexDirection: "row", gap: Spacing.sm, marginTop: 4 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },

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
    lidarrColor: { color: colors.lidarr },
    successColor: { color: colors.success },
  });
