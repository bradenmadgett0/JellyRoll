/**
 * Lidarr Artist Detail — albums and tracks
 */

import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { useLidarrAlbums, useLidarrArtistDetail, useLidarrImageUrl } from '../../services/hooks/useLidarr';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatSize(bytes: number): string {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
    return `${bytes} B`;
}

export default function LidarrDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const numericId = id ? parseInt(id, 10) : undefined;
    const getImageUrl = useLidarrImageUrl();

    const { data: artist, isLoading } = useLidarrArtistDetail(numericId);
    const { data: albums } = useLidarrAlbums(numericId);

    const artistImage = numericId !== undefined ? getImageUrl(numericId, 'poster') : null;

    if (isLoading || !artist) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ title: 'Loading...' }} />
                <ActivityIndicator size="large" color={Colors.lidarr} />
            </View>
        );
    }

    const stats = artist.statistics;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: artist.artistName,
                    headerStyle: { backgroundColor: Colors.backgroundSecondary },
                    headerTintColor: Colors.text,
                    headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
            />
            <ScrollView contentContainerStyle={styles.contentContainer}>
                {/* Artist header */}
                <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
                    {artistImage ? (
                        <Image source={{ uri: artistImage }} style={styles.artistImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.artistImage, styles.imagePlaceholder]}>
                            <Ionicons name="person" size={40} color={Colors.textTertiary} />
                        </View>
                    )}
                    <Text style={styles.artistName}>{artist.artistName}</Text>
                    {artist.artistType && (
                        <Text style={styles.artistType}>{artist.artistType}</Text>
                    )}
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: artist.monitored ? Colors.success + '20' : Colors.textTertiary + '20' }]}>
                            <Text style={[styles.badgeText, { color: artist.monitored ? Colors.success : Colors.textTertiary }]}>
                                {artist.monitored ? 'Monitored' : 'Unmonitored'}
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Stats */}
                {stats && (
                    <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{stats.albumCount ?? 0}</Text>
                            <Text style={styles.statLabel}>Albums</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{stats.trackFileCount ?? 0}/{stats.trackCount ?? 0}</Text>
                            <Text style={styles.statLabel}>Tracks</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{stats.sizeOnDisk ? formatSize(stats.sizeOnDisk) : '--'}</Text>
                            <Text style={styles.statLabel}>Size</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>
                                {stats.trackCount && stats.trackCount > 0
                                    ? Math.round(((stats.trackFileCount ?? 0) / stats.trackCount) * 100)
                                    : 0}%
                            </Text>
                            <Text style={styles.statLabel}>Complete</Text>
                        </View>
                    </Animated.View>
                )}

                {/* Overview */}
                {artist.overview && (
                    <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <Text style={styles.overview}>{artist.overview}</Text>
                    </Animated.View>
                )}

                {/* Albums */}
                {albums && albums.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.section}>
                        <Text style={styles.sectionTitle}>Albums ({albums.length})</Text>
                        {albums.map((album, index) => {
                            const trackProgress = album.statistics
                                ? album.statistics.trackCount > 0
                                    ? Math.round((album.statistics.trackFileCount / album.statistics.trackCount) * 100)
                                    : 0
                                : 0;

                            return (
                                <Animated.View
                                    key={album.id}
                                    entering={FadeInDown.duration(300).delay(300 + index * 50)}
                                >
                                    <View style={styles.albumCard}>
                                        <View style={styles.albumInfo}>
                                            <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
                                            <Text style={styles.albumMeta}>
                                                {album.releaseDate ? new Date(album.releaseDate).getFullYear() : 'TBA'}
                                                {album.albumType ? ` · ${album.albumType}` : ''}
                                            </Text>
                                            <View style={styles.albumProgressRow}>
                                                <View style={styles.albumProgressBar}>
                                                    <View style={[styles.albumProgressFill, { width: `${trackProgress}%` }]} />
                                                </View>
                                                <Text style={styles.albumProgressText}>
                                                    {album.statistics?.trackFileCount ?? 0}/{album.statistics?.trackCount ?? 0}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={[styles.albumStatusBadge, { backgroundColor: album.monitored ? Colors.lidarr + '20' : Colors.textTertiary + '10' }]}>
                                            <Ionicons
                                                name={album.monitored ? 'eye' : 'eye-off'}
                                                size={14}
                                                color={album.monitored ? Colors.lidarr : Colors.textTertiary}
                                            />
                                        </View>
                                    </View>
                                </Animated.View>
                            );
                        })}
                    </Animated.View>
                )}

                {/* Genres */}
                {artist.genres && artist.genres.length > 0 && (
                    <View style={styles.genreRow}>
                        {artist.genres.map((g) => (
                            <View key={g} style={styles.genreChip}>
                                <Text style={styles.genreText}>{g}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    contentContainer: { paddingBottom: 40 },
    loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: { alignItems: 'center', paddingTop: Spacing.xxl, paddingBottom: Spacing.lg },
    artistImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.backgroundTertiary, marginBottom: Spacing.lg },
    imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
    artistName: { fontFamily: 'Inter_700Bold', fontSize: 24, color: Colors.text, textAlign: 'center' },
    artistType: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textTertiary, marginTop: 4 },
    badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },

    // Stats
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.lg, marginHorizontal: Spacing.screenPadding, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.surfaceBorder },
    stat: { alignItems: 'center' },
    statValue: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.lidarr },
    statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary, marginTop: 2 },

    // Sections
    section: { paddingHorizontal: Spacing.screenPadding, marginTop: Spacing.xxl },
    sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: Colors.text, marginBottom: Spacing.md },
    overview: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },

    // Albums
    albumCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.surfaceBorder },
    albumInfo: { flex: 1 },
    albumTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
    albumMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
    albumProgressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6 },
    albumProgressBar: { flex: 1, height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2 },
    albumProgressFill: { height: '100%', backgroundColor: Colors.lidarr, borderRadius: 2 },
    albumProgressText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textTertiary, width: 40 },
    albumStatusBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

    // Genres
    genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.screenPadding, marginTop: Spacing.lg },
    genreChip: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Spacing.radiusFull, backgroundColor: Colors.backgroundTertiary, borderWidth: 1, borderColor: Colors.surfaceBorder },
    genreText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
});
