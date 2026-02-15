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
import { Spacing } from '../../constants/Spacing';
import { AppColors } from '../../hooks/useColors';
import { useThemedStyles } from '../../hooks/useThemedStyles';
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
    const styles = useThemedStyles(createStyles);
    const numericId = id ? parseInt(id, 10) : undefined;
    const getImageUrl = useLidarrImageUrl();

    const { data: artist, isLoading } = useLidarrArtistDetail(numericId);
    const { data: albums } = useLidarrAlbums(numericId);

    const artistImage = numericId !== undefined ? getImageUrl(numericId, 'poster') : null;

    if (isLoading || !artist) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ title: 'Loading...' }} />
                <ActivityIndicator size="large" color={styles.lidarrColor.color as string} />
            </View>
        );
    }

    const stats = artist.statistics;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: artist.artistName,
                    headerStyle: { backgroundColor: styles.headerBg.backgroundColor },
                    headerTintColor: styles.headerTitle.color as string,
                    headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
            />
            <ScrollView contentContainerStyle={styles.contentContainer}>
                {/* Artist header */}
                <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
                    {artistImage ? (
                        <Image source={{ uri: artistImage }} style={styles.artistImageStyle} resizeMode="cover" />
                    ) : (
                        <View style={[styles.artistImageStyle, styles.imagePlaceholder]}>
                            <Ionicons name="person" size={40} color={styles.iconTertiary.color} />
                        </View>
                    )}
                    <Text style={styles.artistName}>{artist.artistName}</Text>
                    {artist.artistType && (
                        <Text style={styles.artistType}>{artist.artistType}</Text>
                    )}
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: artist.monitored ? styles.successColor.color + '20' : styles.iconTertiary.color + '20' }]}>
                            <Text style={[styles.badgeText, { color: artist.monitored ? (styles.successColor.color as string) : (styles.iconTertiary.color as string) }]}>
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
                                        <View style={[styles.albumStatusBadge, { backgroundColor: album.monitored ? styles.lidarrColor.color + '20' : styles.iconTertiary.color + '10' }]}>
                                            <Ionicons
                                                name={album.monitored ? 'eye' : 'eye-off'}
                                                size={14}
                                                color={album.monitored ? (styles.lidarrColor.color as string) : (styles.iconTertiary.color as string)}
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

const createStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { paddingBottom: 40 },
    loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: { alignItems: 'center', paddingTop: Spacing.xxl, paddingBottom: Spacing.lg },
    artistImageStyle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.backgroundTertiary, marginBottom: Spacing.lg },
    imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
    artistName: { fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, textAlign: 'center' },
    artistType: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textTertiary, marginTop: 4 },
    badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },

    // Stats
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.lg, marginHorizontal: Spacing.screenPadding, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.surfaceBorder },
    stat: { alignItems: 'center' },
    statValue: { fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.lidarr },
    statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textTertiary, marginTop: 2 },

    // Sections
    section: { paddingHorizontal: Spacing.screenPadding, marginTop: Spacing.xxl },
    sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.text, marginBottom: Spacing.md },
    overview: { fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.textSecondary, lineHeight: 24 },

    // Albums
    albumCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder },
    albumInfo: { flex: 1 },
    albumTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text },
    albumMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    albumProgressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6 },
    albumProgressBar: { flex: 1, height: 4, backgroundColor: colors.surfaceBorder, borderRadius: 2 },
    albumProgressFill: { height: '100%', backgroundColor: colors.lidarr, borderRadius: 2 },
    albumProgressText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.textTertiary, width: 40 },
    albumStatusBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

    // Genres
    genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.screenPadding, marginTop: Spacing.lg },
    genreChip: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Spacing.radiusFull, backgroundColor: colors.backgroundTertiary, borderWidth: 1, borderColor: colors.surfaceBorder },
    genreText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary },

    // Header nav
    headerBg: { backgroundColor: colors.backgroundSecondary },
    headerTitle: { color: colors.text },

    // Color tokens for inline use
    iconTertiary: { color: colors.textTertiary },
    lidarrColor: { color: colors.lidarr },
    successColor: { color: colors.success },
});
