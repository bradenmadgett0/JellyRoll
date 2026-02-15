/**
 * Sonarr — Series list with live data
 */

import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { useSonarrImageUrl, useSonarrSeries } from '../../services/hooks/useSonarr';
import { SonarrSeries } from '../../types/sonarr';

type SortMode = 'title' | 'dateAdded' | 'year';

export default function SonarrScreen() {
    const router = useRouter();
    const { data: series, isLoading, refetch } = useSonarrSeries();
    const getImageUrl = useSonarrImageUrl();

    const [search, setSearch] = useState('');
    const [sortMode, setSortMode] = useState<SortMode>('title');

    const filteredSeries = useMemo(() => {
        if (!series) return [];
        let filtered = series;
        if (search.length > 0) {
            const term = search.toLowerCase();
            filtered = filtered.filter((s) => s.title.toLowerCase().includes(term));
        }
        return [...filtered].sort((a, b) => {
            switch (sortMode) {
                case 'dateAdded':
                    return new Date(b.added).getTime() - new Date(a.added).getTime();
                case 'year':
                    return b.year - a.year;
                default:
                    return a.sortTitle.localeCompare(b.sortTitle);
            }
        });
    }, [series, search, sortMode]);

    const renderSeries = useCallback(({ item, index }: { item: SonarrSeries; index: number }) => {
        const posterUrl = getImageUrl(item.id, 'poster');
        const stats = item.statistics;
        const episodeProgress = stats
            ? stats.episodeCount > 0
                ? (stats.episodeFileCount / stats.episodeCount) * 100
                : 0
            : 0;

        return (
            <Animated.View entering={FadeIn.duration(300).delay(Math.min(index * 40, 400))}>
                <TouchableOpacity
                    style={styles.seriesCard}
                    onPress={() => router.push(`/sonarr/${item.id}` as any)}
                    activeOpacity={0.7}
                >
                    {posterUrl ? (
                        <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
                    ) : (
                        <View style={[styles.poster, styles.posterPlaceholder]}>
                            <Ionicons name="tv" size={24} color={Colors.textTertiary} />
                        </View>
                    )}
                    <View style={styles.seriesInfo}>
                        <Text style={styles.seriesTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.seriesMeta}>
                            {item.year} · {item.network ?? 'Unknown'} · {item.status}
                        </Text>
                        {stats && (
                            <View style={styles.progressRow}>
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBar, { width: `${episodeProgress}%` }]} />
                                </View>
                                <Text style={styles.progressText}>
                                    {stats.episodeFileCount}/{stats.episodeCount}
                                </Text>
                            </View>
                        )}
                        <View style={styles.tagsRow}>
                            <View style={[styles.statusBadge, { backgroundColor: item.monitored ? Colors.success + '20' : Colors.textTertiary + '20' }]}>
                                <Text style={[styles.statusText, { color: item.monitored ? Colors.success : Colors.textTertiary }]}>
                                    {item.monitored ? 'Monitored' : 'Unmonitored'}
                                </Text>
                            </View>
                            {item.status === 'continuing' && (
                                <View style={[styles.statusBadge, { backgroundColor: Colors.sonarr + '20' }]}>
                                    <Text style={[styles.statusText, { color: Colors.sonarr }]}>Continuing</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
            </Animated.View>
        );
    }, [getImageUrl, router]);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Sonarr',
                    headerStyle: { backgroundColor: Colors.backgroundSecondary },
                    headerTintColor: Colors.text,
                    headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
            />

            {/* Search + Sort */}
            <View style={styles.toolbar}>
                <View style={styles.searchRow}>
                    <Ionicons name="search" size={18} color={Colors.textTertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search series..."
                        placeholderTextColor={Colors.textTertiary}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.sortRow}>
                    {(['title', 'dateAdded', 'year'] as SortMode[]).map((mode) => (
                        <TouchableOpacity
                            key={mode}
                            style={[styles.sortChip, sortMode === mode && styles.sortChipActive]}
                            onPress={() => setSortMode(mode)}
                        >
                            <Text style={[styles.sortChipText, sortMode === mode && styles.sortChipTextActive]}>
                                {mode === 'dateAdded' ? 'Added' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {isLoading ? (
                <View style={styles.centerLoading}>
                    <ActivityIndicator size="large" color={Colors.sonarr} />
                </View>
            ) : (
                <FlatList
                    data={filteredSeries}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderSeries}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.sonarr} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="tv" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyText}>
                                {search ? 'No series match your search' : 'No series in Sonarr'}
                            </Text>
                        </View>
                    }
                    ListHeaderComponent={
                        <Text style={styles.resultCount}>
                            {filteredSeries.length} series{search ? ` matching "${search}"` : ''}
                        </Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    // Toolbar
    toolbar: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md, paddingBottom: Spacing.sm, backgroundColor: Colors.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundTertiary, borderRadius: Spacing.radiusMd, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
    searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.text, paddingVertical: 4 },
    sortRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
    sortChip: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Spacing.radiusFull, backgroundColor: Colors.backgroundTertiary },
    sortChipActive: { backgroundColor: Colors.sonarr },
    sortChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary },
    sortChipTextActive: { color: Colors.textInverse },

    // List
    listContent: { paddingBottom: 32 },
    resultCount: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textTertiary, paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.sm },

    // Series card
    seriesCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.surfaceBorder },
    poster: { width: 56, height: 84, borderRadius: Spacing.radiusSm, backgroundColor: Colors.backgroundTertiary },
    posterPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    seriesInfo: { flex: 1, marginHorizontal: Spacing.md },
    seriesTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
    seriesMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6 },
    progressBarContainer: { flex: 1, height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2 },
    progressBar: { height: '100%', backgroundColor: Colors.sonarr, borderRadius: 2 },
    progressText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textTertiary, width: 40 },
    tagsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 6 },
    statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },

    // Empty/loading
    centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { paddingTop: 80, alignItems: 'center', gap: Spacing.md },
    emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.textTertiary },
});
