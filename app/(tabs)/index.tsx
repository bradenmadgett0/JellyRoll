/**
 * Home Screen — Live dashboard with Jellyfin resume, latest, and *arr data
 */

import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { MediaCardProps } from '../../components/media/MediaCard';
import { MediaRow } from '../../components/media/MediaRow';
import { QueueCard } from '../../components/media/QueueCard';
import { SkeletonRow } from '../../components/ui/Skeleton';
import TabSafeView from '../../components/ui/TabSafeView';
import { SOURCE_COLORS, SOURCE_ICONS } from '../../constants/Sources';
import { Spacing } from '../../constants/Spacing';
import { AppColors } from '../../hooks/useColors';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useJellyfinImageUrl, useLatestItems, useResumeItems } from '../../services/hooks/useJellyfin';
import { useLidarrQueue } from '../../services/hooks/useLidarr';
import { useRadarrCalendar, useRadarrQueue } from '../../services/hooks/useRadarr';
import { useSonarrCalendar, useSonarrQueue } from '../../services/hooks/useSonarr';
import { useServerStore } from '../../services/stores/serverStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Get date range for calendar (today + 7 days)
function getCalendarRange() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function HomeScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const { servers, isLoaded } = useServerStore();
  const [refreshing, setRefreshing] = useState(false);
  const getImageUrl = useJellyfinImageUrl();

  const hasServers = servers.length > 0;
  const hasJellyfin = servers.some((s) => s.type === 'jellyfin');
  const hasSonarr = servers.some((s) => s.type === 'sonarr');
  const hasRadarr = servers.some((s) => s.type === 'radarr');
  const hasLidarr = servers.some((s) => s.type === 'lidarr');

  const { start: calStart, end: calEnd } = useMemo(getCalendarRange, []);

  // Data hooks
  const { data: resumeItems, isLoading: resumeLoading } = useResumeItems();
  const { data: latestItems, isLoading: latestLoading } = useLatestItems();
  const { data: sonarrQueue } = useSonarrQueue();
  const { data: radarrQueue } = useRadarrQueue();
  const { data: lidarrQueue } = useLidarrQueue();
  const { data: sonarrCalendar } = useSonarrCalendar(calStart, calEnd);
  const { data: radarrCalendar } = useRadarrCalendar(calStart, calEnd);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  // Transform resume items to MediaCard props
  const resumeCards: MediaCardProps[] = useMemo(() => {
    if (!resumeItems) return [];
    return resumeItems.map((item) => ({
      id: item.Id,
      title: item.Type === 'Episode'
        ? `${item.SeriesName ?? ''}`
        : item.Name,
      subtitle: item.Type === 'Episode'
        ? `S${item.ParentIndexNumber ?? 0}E${item.IndexNumber ?? 0} · ${item.Name}`
        : undefined,
      imageUrl: getImageUrl(
        item.Type === 'Episode' ? (item.SeriesId ?? item.Id) : item.Id,
        item.Type === 'Episode' ? 'Primary' : 'Backdrop',
        300
      ),
      progress: item.UserData?.PlayedPercentage,
      onPress: () => router.push(`/media/${item.Id}`),
      year: item.ProductionYear,
    }));
  }, [resumeItems, getImageUrl, router]);

  // Transform latest items
  const latestCards: MediaCardProps[] = useMemo(() => {
    if (!latestItems) return [];
    return latestItems.slice(0, 12).map((item) => ({
      id: item.Id,
      title: item.Name,
      imageUrl: getImageUrl(item.Id, 'Primary', 200),
      badge: item.Type === 'Movie' ? 'Movie' : item.Type === 'Series' ? 'Series' : undefined,
      year: item.ProductionYear,
      rating: item.CommunityRating,
      onPress: () => router.push(`/media/${item.Id}`),
    }));
  }, [latestItems, getImageUrl, router]);

  // Combined queue items
  const allQueueItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle?: string;
      status: string;
      progress: number;
      size?: string;
      timeLeft?: string;
      quality?: string;
      source: 'sonarr' | 'radarr' | 'lidarr';
    }> = [];

    const formatSize = (bytes: number) => {
      if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
      if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
      return `${(bytes / 1e3).toFixed(0)} KB`;
    };

    sonarrQueue?.records?.forEach((q) => {
      items.push({
        id: `sonarr-${q.id}`,
        title: q.title,
        status: q.status ?? 'queued',
        progress: q.sizeleft && q.size ? ((1 - q.sizeleft / q.size) * 100) : 0,
        size: q.size ? formatSize(q.size) : undefined,
        timeLeft: q.timeleft ?? undefined,
        quality: q.quality?.quality?.name,
        source: 'sonarr',
      });
    });

    radarrQueue?.records?.forEach((q) => {
      items.push({
        id: `radarr-${q.id}`,
        title: q.title,
        status: q.status ?? 'queued',
        progress: q.sizeleft && q.size ? ((1 - q.sizeleft / q.size) * 100) : 0,
        size: q.size ? formatSize(q.size) : undefined,
        timeLeft: q.timeleft ?? undefined,
        quality: q.quality?.quality?.name,
        source: 'radarr',
      });
    });

    lidarrQueue?.records?.forEach((q) => {
      items.push({
        id: `lidarr-${q.id}`,
        title: q.title,
        status: q.status ?? 'queued',
        progress: q.sizeleft && q.size ? ((1 - q.sizeleft / q.size) * 100) : 0,
        size: q.size ? formatSize(q.size) : undefined,
        timeLeft: q.timeleft ?? undefined,
        quality: q.quality?.quality?.name,
        source: 'lidarr',
      });
    });

    return items;
  }, [sonarrQueue, radarrQueue, lidarrQueue]);

  // Upcoming items (combined calendar)
  const upcomingCards: MediaCardProps[] = useMemo(() => {
    const items: MediaCardProps[] = [];

    sonarrCalendar?.forEach((ep) => {
      items.push({
        id: `sonarr-cal-${ep.id}`,
        title: ep.series?.title ?? ep.title,
        subtitle: `S${ep.seasonNumber}E${ep.episodeNumber} · ${ep.title}`,
        badge: 'TV',
        badgeColor: styles.sonarrColor.color as string,
        onPress: () => { },
      });
    });

    radarrCalendar?.forEach((movie) => {
      items.push({
        id: `radarr-cal-${movie.id}`,
        title: movie.title,
        subtitle: movie.digitalRelease
          ? `Digital: ${new Date(movie.digitalRelease).toLocaleDateString()}`
          : undefined,
        badge: 'Movie',
        badgeColor: styles.radarrColor.color as string,
        year: movie.year,
        onPress: () => { },
      });
    });

    return items;
  }, [sonarrCalendar, radarrCalendar, styles]);

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>JellyRoll</Text>
            <Text style={styles.subtitle}>Loading...</Text>
          </View>
        </View>
        <SkeletonRow variant="backdrop" count={3} />
        <SkeletonRow variant="poster" count={4} />
      </View>
    );
  }

  if (!hasServers) {
    return (
      <View style={styles.emptyContainer}>
        <Animated.View entering={FadeInDown.duration(800).delay(200)} style={styles.emptyContent}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="planet" size={80} color={styles.iconPrimary.color} />
          </View>
          <Text style={styles.emptyTitle}>Welcome to JellyRoll</Text>
          <Text style={styles.emptySubtitle}>
            Connect your media servers to get started.{'\n'}
            Add your Jellyfin, Sonarr, Radarr, or Lidarr servers.
          </Text>
          <TouchableOpacity
            style={styles.addServerButton}
            onPress={() => router.push('/server/add')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={22} color={styles.addServerButtonText.color} />
            <Text style={styles.addServerButtonText}>Add Your First Server</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={styles.iconPrimary.color as string} />
      }
    >
      <TabSafeView>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>JellyRoll</Text>
            <Text style={styles.subtitle}>
              {servers.length} server{servers.length !== 1 ? 's' : ''} connected
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/search' as any)}
            >
              <Ionicons name="search" size={22} color={styles.greeting.color} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/server/add')}
            >
              <Ionicons name="add" size={24} color={styles.iconPrimary.color} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Server cards */}
        <Animated.View entering={FadeInDown.duration(500).delay(50)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.serverCardsContainer}
          >
            {servers.map((server, index) => (
              <Animated.View key={server.id} entering={FadeInRight.duration(400).delay(index * 80)}>
                <TouchableOpacity
                  style={[styles.serverCard, { borderLeftColor: SOURCE_COLORS[server.type] }]}
                  onPress={() => router.push(`/server/${server.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.serverIconBg, { backgroundColor: SOURCE_COLORS[server.type] + '20' }]}>
                    <Ionicons name={SOURCE_ICONS[server.type]} size={22} color={SOURCE_COLORS[server.type]} />
                  </View>
                  <Text style={styles.serverCardName} numberOfLines={1}>{server.name}</Text>
                  <Text style={styles.serverCardType}>{server.type}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Continue Watching */}
        {hasJellyfin && (
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <MediaRow
              title="Continue Watching"
              items={resumeCards}
              isLoading={resumeLoading}
              variant="backdrop"
              emptyMessage="No in-progress items"
            />
          </Animated.View>
        )}

        {/* Recently Added */}
        {hasJellyfin && (
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <MediaRow
              title="Recently Added"
              items={latestCards}
              isLoading={latestLoading}
              variant="poster"
              emptyMessage="No recent additions"
            />
          </Animated.View>
        )}

        {/* Upcoming */}
        {upcomingCards.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <MediaRow
              title="Upcoming"
              items={upcomingCards}
              variant="poster"
              emptyMessage="Nothing upcoming"
            />
          </Animated.View>
        )}

        {/* Download Activity */}
        {allQueueItems.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <Text style={styles.sectionTitle}>
              Downloads ({allQueueItems.length})
            </Text>
            <View style={styles.queueContainer}>
              {allQueueItems.slice(0, 5).map((item) => (
                <QueueCard
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  status={item.status}
                  progress={item.progress}
                  size={item.size}
                  timeLeft={item.timeLeft}
                  quality={item.quality}
                  source={item.source}
                />
              ))}
              {allQueueItems.length > 5 && (
                <TouchableOpacity
                  style={styles.seeMoreQueue}
                  onPress={() => router.push('/(tabs)/manage')}
                >
                  <Text style={styles.seeMoreText}>
                    +{allQueueItems.length - 5} more in queue
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Quick Actions - only show if no live data yet */}
        {!hasJellyfin && allQueueItems.length === 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/manage')}>
                <Ionicons name="download" size={28} color={styles.sonarrColor.color} />
                <Text style={styles.quickActionText}>Download Queue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/server/add')}>
                <Ionicons name="add-circle" size={28} color={styles.iconPrimary.color} />
                <Text style={styles.quickActionText}>Add Server</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </TabSafeView>
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 16, fontFamily: 'Inter_500Medium' },

  // Empty state
  emptyContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.screenPadding },
  emptyContent: { alignItems: 'center', maxWidth: 320 },
  emptyIconContainer: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.glassHighlight, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xxl },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, color: colors.text, marginBottom: Spacing.md, textAlign: 'center' },
  emptySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xxxl },
  addServerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg, borderRadius: Spacing.radiusFull, gap: Spacing.sm },
  addServerButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textInverse },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 28, color: colors.text },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder },

  // Server cards
  serverCardsContainer: { paddingHorizontal: Spacing.screenPadding, gap: Spacing.md, marginBottom: Spacing.lg },
  serverCard: { width: 130, backgroundColor: colors.backgroundTertiary, borderRadius: Spacing.radiusMd, padding: Spacing.md, borderLeftWidth: 3, borderWidth: 1, borderColor: colors.surfaceBorder },
  serverIconBg: { width: 36, height: 36, borderRadius: Spacing.radiusSm, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  serverCardName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginBottom: 2 },
  serverCardType: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textTertiary, textTransform: 'capitalize' },

  // Sections
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.text, paddingHorizontal: Spacing.screenPadding, marginTop: Spacing.xl, marginBottom: Spacing.md },
  queueContainer: { paddingHorizontal: Spacing.screenPadding },
  seeMoreQueue: { alignItems: 'center', paddingVertical: Spacing.md },
  seeMoreText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.primary },

  // Quick actions
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.screenPadding, gap: Spacing.md },
  quickAction: { width: (SCREEN_WIDTH - Spacing.screenPadding * 2 - Spacing.md) / 2, backgroundColor: colors.backgroundTertiary, borderRadius: Spacing.radiusMd, padding: Spacing.lg, borderWidth: 1, borderColor: colors.surfaceBorder, gap: Spacing.sm },
  quickActionText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.text },

  // Color tokens for inline use
  iconPrimary: { color: colors.primary },
  sonarrColor: { color: colors.sonarr },
  radarrColor: { color: colors.radarr },
});
