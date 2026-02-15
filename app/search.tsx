/**
 * Global Search Screen — Cross-service search with debounced input
 */

import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { SOURCE_COLORS, SOURCE_ICONS, SOURCE_LABELS } from '../constants/Sources';
import { Spacing } from '../constants/Spacing';
import { SearchResult, useGlobalSearch } from '../services/hooks/useSearch';

export default function SearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const { groupedResults, isLoading, isSearching, totalResults } = useGlobalSearch(query);

    const handleResultPress = useCallback((result: SearchResult) => {
        Keyboard.dismiss();
        switch (result.source) {
            case 'jellyfin':
                router.push(`/media/${result.sourceId}` as any);
                break;
            case 'sonarr':
                // Navigate to sonarr if we have a local series ID
                break;
            case 'radarr':
                break;
            case 'lidarr':
                break;
        }
    }, [router]);

    const sourceKeys = Object.keys(groupedResults);

    // Build flat list data with section headers
    const flatData: Array<{ type: 'header'; source: string } | { type: 'result'; item: SearchResult }> = [];
    sourceKeys.forEach((source) => {
        flatData.push({ type: 'header', source });
        groupedResults[source].forEach((item) => {
            flatData.push({ type: 'result', item });
        });
    });

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            {/* Search bar */}
            <Animated.View entering={FadeInDown.duration(400)} style={styles.searchBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.inputContainer}>
                    <Ionicons name="search" size={18} color={Colors.textTertiary} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search all services..."
                        placeholderTextColor={Colors.textTertiary}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            {/* Loading */}
            {isLoading && (
                <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingText}>Searching...</Text>
                </View>
            )}

            {/* Results */}
            {isSearching && !isLoading && totalResults === 0 && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search" size={48} color={Colors.textTertiary} />
                    <Text style={styles.emptyText}>No results for "{query}"</Text>
                    <Text style={styles.emptySubtext}>Try a different search term</Text>
                </View>
            )}

            {!isSearching && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="telescope" size={56} color={Colors.textTertiary} />
                    <Text style={styles.emptyText}>Search across all your services</Text>
                    <Text style={styles.emptySubtext}>
                        Find movies, series, artists, and more
                    </Text>
                </View>
            )}

            {totalResults > 0 && (
                <FlatList
                    data={flatData}
                    keyExtractor={(item, index) =>
                        item.type === 'header' ? `h-${item.source}` : `r-${item.item.id}`
                    }
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => {
                        if (item.type === 'header') {
                            const color = SOURCE_COLORS[item.source] ?? Colors.primary;
                            const icon = SOURCE_ICONS[item.source] ?? 'server';
                            const label = SOURCE_LABELS[item.source] ?? item.source;
                            const count = groupedResults[item.source]?.length ?? 0;
                            return (
                                <Animated.View entering={FadeIn.duration(300).delay(index * 30)}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name={icon} size={16} color={color} />
                                        <Text style={[styles.sectionTitle, { color }]}>{label}</Text>
                                        <Text style={styles.sectionCount}>{count}</Text>
                                    </View>
                                </Animated.View>
                            );
                        }

                        const result = item.item;
                        const color = SOURCE_COLORS[result.source] ?? Colors.primary;

                        return (
                            <Animated.View entering={FadeIn.duration(250).delay(Math.min(index * 30, 400))}>
                                <TouchableOpacity
                                    style={styles.resultCard}
                                    onPress={() => handleResultPress(result)}
                                    activeOpacity={0.7}
                                >
                                    {result.imageUrl ? (
                                        <Image
                                            source={{ uri: result.imageUrl }}
                                            style={styles.resultImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
                                            <Ionicons
                                                name={SOURCE_ICONS[result.source] ?? 'disc'}
                                                size={20}
                                                color={color}
                                            />
                                        </View>
                                    )}
                                    <View style={styles.resultInfo}>
                                        <Text style={styles.resultTitle} numberOfLines={1}>
                                            {result.title}
                                        </Text>
                                        {result.subtitle && (
                                            <Text style={styles.resultSubtitle} numberOfLines={1}>
                                                {result.subtitle}
                                            </Text>
                                        )}
                                        <View style={styles.resultMeta}>
                                            {result.year && (
                                                <Text style={styles.resultYear}>{result.year}</Text>
                                            )}
                                            <View style={[styles.typeBadge, { backgroundColor: color + '15' }]}>
                                                <Text style={[styles.typeBadgeText, { color }]}>
                                                    {result.type}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    // Search bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 52,
        paddingHorizontal: Spacing.screenPadding,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.backgroundSecondary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceBorder,
        gap: Spacing.sm,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundTertiary,
        borderRadius: Spacing.radiusMd,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    input: {
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        color: Colors.text,
        paddingVertical: 4,
    },

    // Loading
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
    },
    loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary },

    // Empty
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
        paddingBottom: 80,
    },
    emptyText: { fontFamily: 'Inter_500Medium', fontSize: 16, color: Colors.textSecondary },
    emptySubtext: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textTertiary },

    // Results
    listContent: { paddingBottom: 32 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.screenPadding,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.3 },
    sectionCount: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary },

    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.surfaceBorder,
    },
    resultImage: {
        width: 44,
        height: 44,
        borderRadius: Spacing.radiusSm,
        backgroundColor: Colors.backgroundTertiary,
    },
    resultImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
    resultInfo: { flex: 1, marginHorizontal: Spacing.md },
    resultTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
    resultSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    resultMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
    resultYear: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary },
    typeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
    typeBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
});
