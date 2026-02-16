/**
 * Media Detail Screen — Full media info with hero backdrop, metadata, cast, play button
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { EpisodeList, SeasonGroup } from '../../components/media/EpisodeList';
import { Spacing } from '../../constants/Spacing';
import { AppColors } from '../../hooks/useColors';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import {
    useJellyfinDetail,
    useJellyfinImageUrl,
    useJellyfinSeasons
} from '../../services/hooks/useJellyfin';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BACKDROP_HEIGHT = SCREEN_HEIGHT * 0.45;

function formatRuntime(ticks?: number): string {
    if (!ticks) return '';
    const minutes = Math.floor(ticks / 600000000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

function formatResumeTime(ticks: number): string {
    const totalSeconds = Math.floor(ticks / 10_000_000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function MediaDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const styles = useThemedStyles(createStyles);
    const getImageUrl = useJellyfinImageUrl();

    const { data: item, isLoading, error } = useJellyfinDetail(id);
    const isSeries = item?.Type === 'Series';
    const { data: seasons } = useJellyfinSeasons(isSeries ? id : undefined);

    const [expandedSeason, setExpandedSeason] = useState<string | undefined>();

    // Build season/episode list for series
    const seasonGroups: SeasonGroup[] = useMemo(() => {
        if (!seasons) return [];
        return seasons.map((s) => ({
            seasonNumber: s.IndexNumber ?? 0,
            episodes: [],
            totalEpisodes: s.ChildCount,
        }));
    }, [seasons]);

    const backdropUrl = item
        ? getImageUrl(
            item.ParentBackdropItemId ?? item.Id,
            'Backdrop',
            SCREEN_WIDTH * 2
        )
        : null;

    const posterUrl = item ? getImageUrl(item.Id, 'Primary', 300) : null;

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={styles.iconPrimary.color as string} />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    if (error || !item) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ title: 'Error' }} />
                <Ionicons name="alert-circle" size={48} color={styles.iconError.color} />
                <Text style={styles.errorText}>Failed to load media</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const genreText = item.Genres?.join(' · ') ?? '';
    const yearText = item.ProductionYear ? String(item.ProductionYear) : '';
    const ratingText = item.OfficialRating ?? '';
    const runtimeText = formatRuntime(item.RunTimeTicks);
    const metaItems = [yearText, ratingText, runtimeText].filter(Boolean);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                bounces={true}
            >
                {/* Hero backdrop */}
                <Animated.View entering={FadeIn.duration(600)} style={styles.heroContainer}>
                    {backdropUrl ? (
                        <Image source={{ uri: backdropUrl }} style={styles.backdropImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.backdropImage, styles.backdropPlaceholder]}>
                            <Ionicons name="image" size={48} color={styles.iconTertiary.color} />
                        </View>
                    )}
                    <LinearGradient
                        colors={['transparent', 'rgba(13, 17, 23, 0.4)', 'rgba(13, 17, 23, 0.9)', styles.container.backgroundColor as string]}
                        style={styles.heroGradient}
                    />

                    {/* Back button */}
                    <TouchableOpacity style={styles.heroBackButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={styles.iconText.color} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Content overlay */}
                <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.contentOverlay}>
                    <View style={styles.titleRow}>
                        {/* Poster */}
                        {posterUrl && (
                            <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
                        )}
                        <View style={styles.titleInfo}>
                            <Text style={styles.title}>{item.Name}</Text>
                            {item.Type === 'Episode' && item.SeriesName && (
                                <Text style={styles.seriesName}>{item.SeriesName}</Text>
                            )}
                            {item.Type === 'Episode' && (
                                <Text style={styles.episodeLabel}>
                                    S{item.ParentIndexNumber ?? 0}E{item.IndexNumber ?? 0}
                                </Text>
                            )}
                            {metaItems.length > 0 && (
                                <Text style={styles.meta}>{metaItems.join(' · ')}</Text>
                            )}
                            {item.CommunityRating && (
                                <View style={styles.ratingRow}>
                                    <Ionicons name="star" size={14} color={styles.ratingText.color} />
                                    <Text style={styles.ratingText}>{item.CommunityRating.toFixed(1)}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Play / Resume button */}
                    {(item.Type === 'Movie' || item.Type === 'Episode') && (() => {
                        const positionTicks = item.UserData?.PlaybackPositionTicks ?? 0;
                        const isResumable = positionTicks > 0;
                        const playedPct = item.UserData?.PlayedPercentage ?? 0;

                        return (
                            <View>
                                <TouchableOpacity
                                    style={styles.playButton}
                                    onPress={() => router.push({
                                        pathname: '/media/player',
                                        params: {
                                            itemId: item.Id,
                                            startTicks: String(positionTicks),
                                        },
                                    })}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="play" size={22} color={styles.playButtonText.color} />
                                    <Text style={styles.playButtonText}>
                                        {isResumable ? `Resume · ${formatResumeTime(positionTicks)}` : 'Play'}
                                    </Text>
                                </TouchableOpacity>
                                {isResumable && (
                                    <View style={styles.resumeProgressContainer}>
                                        <View style={[styles.resumeProgressBar, { width: `${Math.min(playedPct, 100)}%` }]} />
                                    </View>
                                )}
                            </View>
                        );
                    })()}

                    {/* Genres */}
                    {genreText && (
                        <Text style={styles.genres}>{genreText}</Text>
                    )}

                    {/* Overview */}
                    {item.Overview && (
                        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                            <Text style={styles.sectionTitle}>Overview</Text>
                            <Text style={styles.overview}>{item.Overview}</Text>
                        </Animated.View>
                    )}

                    {/* Cast */}
                    {item.People && item.People.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
                            <Text style={styles.sectionTitle}>Cast & Crew</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.castScroll}>
                                {item.People.filter((p) => p.Type === 'Actor').slice(0, 15).map((person) => {
                                    const personImage = person.PrimaryImageTag
                                        ? getImageUrl(person.Id, 'Primary', 100)
                                        : null;
                                    return (
                                        <View key={person.Id + (person.Role ?? '')} style={styles.castCard}>
                                            {personImage ? (
                                                <Image source={{ uri: personImage }} style={styles.castImage} />
                                            ) : (
                                                <View style={[styles.castImage, styles.castImagePlaceholder]}>
                                                    <Ionicons name="person" size={18} color={styles.iconTertiary.color} />
                                                </View>
                                            )}
                                            <Text style={styles.castName} numberOfLines={1}>{person.Name}</Text>
                                            {person.Role && (
                                                <Text style={styles.castRole} numberOfLines={1}>{person.Role}</Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </Animated.View>
                    )}

                    {/* Studios */}
                    {item.Studios && item.Studios.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
                            <Text style={styles.sectionTitle}>Studios</Text>
                            <View style={styles.studioRow}>
                                {item.Studios.map((s) => (
                                    <View key={s.Id} style={styles.studioChip}>
                                        <Text style={styles.studioText}>{s.Name}</Text>
                                    </View>
                                ))}
                            </View>
                        </Animated.View>
                    )}

                    {/* Seasons/Episodes for Series */}
                    {isSeries && seasonGroups.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
                            <Text style={styles.sectionTitle}>
                                Seasons ({seasonGroups.length})
                            </Text>
                            <EpisodeList seasons={seasonGroups} accentColor={styles.jellyfinColor.color as string} />
                        </Animated.View>
                    )}

                    {/* Media info */}
                    {item.MediaSources && item.MediaSources.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(600)}>
                            <Text style={styles.sectionTitle}>Media Info</Text>
                            {item.MediaSources.map((source) => (
                                <View key={source.Id} style={styles.mediaInfoCard}>
                                    <Text style={styles.mediaInfoName}>{source.Name}</Text>
                                    <View style={styles.mediaInfoRow}>
                                        {source.Container && (
                                            <View style={styles.mediaInfoChip}>
                                                <Text style={styles.mediaInfoChipText}>{source.Container.toUpperCase()}</Text>
                                            </View>
                                        )}
                                        {source.Bitrate && (
                                            <View style={styles.mediaInfoChip}>
                                                <Text style={styles.mediaInfoChipText}>
                                                    {(source.Bitrate / 1e6).toFixed(1)} Mbps
                                                </Text>
                                            </View>
                                        )}
                                        {source.Size && (
                                            <View style={styles.mediaInfoChip}>
                                                <Text style={styles.mediaInfoChipText}>
                                                    {(source.Size / 1e9).toFixed(1)} GB
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {source.MediaStreams?.filter((s) => s.Type === 'Video').map((stream) => (
                                        <Text key={stream.Index} style={styles.mediaStreamText}>
                                            Video: {stream.DisplayTitle ?? `${stream.Codec} ${stream.Width}×${stream.Height}`}
                                        </Text>
                                    ))}
                                    {source.MediaStreams?.filter((s) => s.Type === 'Audio').map((stream) => (
                                        <Text key={stream.Index} style={styles.mediaStreamText}>
                                            Audio: {stream.DisplayTitle ?? `${stream.Codec} ${stream.Channels}ch`}
                                        </Text>
                                    ))}
                                </View>
                            ))}
                        </Animated.View>
                    )}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    contentContainer: { paddingBottom: 40 },
    loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
    loadingText: { color: colors.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular' },
    errorText: { color: colors.error, fontSize: 16, fontFamily: 'Inter_500Medium', marginTop: Spacing.sm },
    backBtn: { marginTop: Spacing.lg, backgroundColor: colors.backgroundTertiary, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Spacing.radiusMd },
    backBtnText: { color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 15 },

    // Hero
    heroContainer: { width: SCREEN_WIDTH, height: BACKDROP_HEIGHT, position: 'relative' },
    backdropImage: { width: '100%', height: '100%' },
    backdropPlaceholder: { backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
    heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: BACKDROP_HEIGHT * 0.7 },
    heroBackButton: { position: 'absolute', top: 52, left: Spacing.screenPadding, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

    // Content
    contentOverlay: { paddingHorizontal: Spacing.screenPadding, marginTop: -60 },
    titleRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.lg },
    poster: { width: 100, height: 150, borderRadius: Spacing.radiusMd, backgroundColor: colors.backgroundTertiary },
    titleInfo: { flex: 1, justifyContent: 'flex-end' },
    title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, lineHeight: 30 },
    seriesName: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.jellyfin, marginTop: 2 },
    episodeLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    meta: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary, marginTop: 6 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    ratingText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.warning },

    // Play button
    playButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: Spacing.md, borderRadius: Spacing.radiusMd, gap: Spacing.sm, marginBottom: Spacing.lg },
    playButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textInverse },
    resumeProgressContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: colors.surfaceBorder, borderBottomLeftRadius: Spacing.radiusMd, borderBottomRightRadius: Spacing.radiusMd, overflow: 'hidden' },
    resumeProgressBar: { height: '100%', backgroundColor: colors.jellyfin },

    // Genres
    genres: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.primary, marginBottom: Spacing.md },

    // Sections
    sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.text, marginTop: Spacing.xxl, marginBottom: Spacing.md },
    overview: { fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.textSecondary, lineHeight: 24 },

    // Cast
    castScroll: { marginBottom: Spacing.md },
    castCard: { width: 72, marginRight: Spacing.md, alignItems: 'center' },
    castImage: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.backgroundTertiary, marginBottom: 6 },
    castImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
    castName: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.text, textAlign: 'center' },
    castRole: { fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textTertiary, textAlign: 'center' },

    // Studios
    studioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    studioChip: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Spacing.radiusFull, backgroundColor: colors.backgroundTertiary, borderWidth: 1, borderColor: colors.surfaceBorder },
    studioText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary },

    // Media info
    mediaInfoCard: { backgroundColor: colors.backgroundTertiary, borderRadius: Spacing.radiusMd, padding: Spacing.lg, borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: Spacing.sm },
    mediaInfoName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.text, marginBottom: Spacing.sm },
    mediaInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
    mediaInfoChip: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.surfaceHover },
    mediaInfoChipText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.textSecondary },
    mediaStreamText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textTertiary, marginTop: 2 },

    // Color tokens for inline use
    iconPrimary: { color: colors.primary },
    iconTertiary: { color: colors.textTertiary },
    iconText: { color: colors.text },
    iconError: { color: colors.error },
    jellyfinColor: { color: colors.jellyfin },
});
