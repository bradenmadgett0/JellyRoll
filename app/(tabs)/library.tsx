/**
 * Library Screen — Browse Jellyfin media with live data
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { MediaCard } from '../../components/media/MediaCard';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { useJellyfinImageUrl, useJellyfinItems, useJellyfinLibraries } from '../../services/hooks/useJellyfin';
import { useServerStore } from '../../services/stores/serverStore';
import { JellyfinItem } from '../../types/jellyfin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const CARD_GAP = Spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.screenPadding * 2 - CARD_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const LIBRARY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    movies: 'film',
    tvshows: 'tv',
    music: 'musical-notes',
    books: 'book',
    photos: 'images',
    playlists: 'list',
    boxsets: 'albums',
};

export default function LibraryScreen() {
    const router = useRouter();
    const servers = useServerStore((s) => s.servers);
    const jellyfinServers = servers.filter((s) => s.type === 'jellyfin');
    const hasJellyfin = jellyfinServers.length > 0;
    const getImageUrl = useJellyfinImageUrl();

    const [selectedLibraryId, setSelectedLibraryId] = useState<string | undefined>();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const { data: libraries, isLoading: libLoading, refetch: refetchLibs } = useJellyfinLibraries();

    const {
        data: itemsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: itemsLoading,
        refetch: refetchItems,
    } = useJellyfinItems({
        parentId: selectedLibraryId,
        enabled: !!selectedLibraryId,
    });

    const items = useMemo(() => {
        return itemsData?.pages.flatMap((page) => page.Items) ?? [];
    }, [itemsData]);

    const totalCount = itemsData?.pages[0]?.TotalRecordCount ?? 0;

    const onRefresh = useCallback(async () => {
        await Promise.all([refetchLibs(), refetchItems()]);
    }, [refetchLibs, refetchItems]);

    const renderItem = useCallback(({ item, index }: { item: JellyfinItem; index: number }) => {
        const imageUrl = getImageUrl(item.Id, 'Primary', 200);
        return (
            <Animated.View entering={FadeIn.duration(300).delay(Math.min(index * 30, 300))}>
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
                        badge={item.Type === 'Movie' ? undefined : item.Type === 'Series' ? 'Series' : undefined}
                        variant="grid"
                        onPress={() => router.push(`/media/${item.Id}`)}
                    />
                </TouchableOpacity>
            </Animated.View>
        );
    }, [getImageUrl, router]);

    // Empty state
    if (!hasJellyfin) {
        return (
            <View style={styles.emptyContainer}>
                <Animated.View entering={FadeInDown.duration(800)} style={styles.emptyContent}>
                    <Ionicons name="library" size={64} color={Colors.textTertiary} />
                    <Text style={styles.emptyTitle}>No Library Connected</Text>
                    <Text style={styles.emptySubtitle}>
                        Add a Jellyfin server to browse your media library.
                    </Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => router.push('/server/add')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add-circle" size={20} color={Colors.textInverse} />
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
                    <ActivityIndicator size="small" color={Colors.primary} />
                </View>
            ) : (
                <Animated.View entering={FadeInDown.duration(400)}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.libPicker}
                        data={[{ Id: undefined, Name: 'All', CollectionType: undefined }, ...(libraries ?? [])]}
                        keyExtractor={(item) => item.Id ?? 'all'}
                        renderItem={({ item }) => {
                            const isSelected = item.Id === selectedLibraryId;
                            const iconName = LIBRARY_ICONS[item.CollectionType ?? ''] ?? 'folder';
                            return (
                                <TouchableOpacity
                                    style={[styles.libChip, isSelected && styles.libChipSelected]}
                                    onPress={() => setSelectedLibraryId(item.Id ?? undefined)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={iconName}
                                        size={16}
                                        color={isSelected ? Colors.textInverse : Colors.textSecondary}
                                    />
                                    <Text style={[styles.libChipText, isSelected && styles.libChipTextSelected]}>
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
                        {totalCount > 0 ? `${totalCount} items` : ''}
                    </Text>
                    <View style={styles.viewToggle}>
                        <TouchableOpacity onPress={() => setViewMode('grid')}>
                            <Ionicons
                                name="grid"
                                size={20}
                                color={viewMode === 'grid' ? Colors.primary : Colors.textTertiary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setViewMode('list')}>
                            <Ionicons
                                name="list"
                                size={20}
                                color={viewMode === 'list' ? Colors.primary : Colors.textTertiary}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Items grid */}
            {itemsLoading ? (
                <View style={styles.centerLoading}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading library...</Text>
                </View>
            ) : !selectedLibraryId ? (
                <View style={styles.centerLoading}>
                    <Ionicons name="albums" size={48} color={Colors.textTertiary} />
                    <Text style={styles.pickLibText}>Select a library above to browse</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    numColumns={GRID_COLUMNS}
                    keyExtractor={(item) => item.Id}
                    renderItem={renderItem}
                    columnWrapperStyle={styles.gridRow}
                    contentContainerStyle={styles.gridContent}
                    onEndReached={() => hasNextPage && fetchNextPage()}
                    onEndReachedThreshold={0.5}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: 20 }} />
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.centerLoading}>
                            <Ionicons name="folder-open" size={48} color={Colors.textTertiary} />
                            <Text style={styles.pickLibText}>This library is empty</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    // Library picker
    libPicker: { paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.md, gap: Spacing.sm },
    libPickerLoading: { height: 56, justifyContent: 'center', alignItems: 'center' },
    libChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Spacing.radiusFull, backgroundColor: Colors.backgroundTertiary, borderWidth: 1, borderColor: Colors.surfaceBorder },
    libChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    libChipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
    libChipTextSelected: { color: Colors.textInverse },

    // Toolbar
    toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingBottom: Spacing.sm },
    resultCount: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textTertiary },
    viewToggle: { flexDirection: 'row', gap: Spacing.lg },

    // Grid
    gridContent: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 32 },
    gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
    gridItem: { marginRight: 0 },

    // Loading/empty
    centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: Spacing.md },
    loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary },
    pickLibText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.textTertiary, textAlign: 'center' },

    // Empty state
    emptyContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    emptyContent: { alignItems: 'center', gap: Spacing.md },
    emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 22, color: Colors.text },
    emptySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.jellyfin, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Spacing.radiusFull, gap: Spacing.sm, marginTop: Spacing.md },
    addButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.textInverse },
});
