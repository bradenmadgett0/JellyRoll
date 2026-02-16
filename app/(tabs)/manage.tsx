/**
 * Manage Screen — *arr management hub with live queue data
 */

import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { QueueCard } from '../../components/media/QueueCard';
import TabSafeView from '../../components/ui/TabSafeView';
import { SOURCE_COLORS, SOURCE_ICONS } from '../../constants/Sources';
import { Spacing } from '../../constants/Spacing';
import { AppColors } from '../../hooks/useColors';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useLidarrQueue } from '../../services/hooks/useLidarr';
import { useRadarrQueue } from '../../services/hooks/useRadarr';
import { useSonarrQueue } from '../../services/hooks/useSonarr';
import { useServerStore } from '../../services/stores/serverStore';
import { ServerType } from '../../types/server';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ServiceCardProps {
    type: ServerType;
    name: string;
    queueCount: number;
    onPress: () => void;
    delay: number;
    styles: ReturnType<typeof createStyles>;
}

function ServiceCard({ type, name, queueCount, onPress, delay, styles }: ServiceCardProps) {
    const color = SOURCE_COLORS[type];
    const icon = SOURCE_ICONS[type];

    return (
        <Animated.View entering={FadeInDown.duration(400).delay(delay)}>
            <TouchableOpacity style={[styles.serviceCard, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.7}>
                <View style={styles.serviceCardHeader}>
                    <View style={[styles.serviceIconBg, { backgroundColor: color + '20' }]}>
                        <Ionicons name={icon} size={24} color={color} />
                    </View>
                    <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{name}</Text>
                        <Text style={styles.serviceType}>{type}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={styles.serviceType.color} />
                </View>
                {queueCount > 0 && (
                    <View style={[styles.queueBadge, { backgroundColor: color + '15' }]}>
                        <Ionicons name="download" size={14} color={color} />
                        <Text style={[styles.queueBadgeText, { color }]}>
                            {queueCount} in queue
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function ManageScreen() {
    const router = useRouter();
    const styles = useThemedStyles(createStyles);
    const queryClient = useQueryClient();
    const servers = useServerStore((s) => s.servers);

    const arrServers = servers.filter((s) => s.type !== 'jellyfin');
    const sonarrServers = servers.filter((s) => s.type === 'sonarr');
    const radarrServers = servers.filter((s) => s.type === 'radarr');
    const lidarrServers = servers.filter((s) => s.type === 'lidarr');

    const { data: sonarrQueue } = useSonarrQueue();
    const { data: radarrQueue } = useRadarrQueue();
    const { data: lidarrQueue } = useLidarrQueue();

    const sonarrQueueCount = sonarrQueue?.totalRecords ?? 0;
    const radarrQueueCount = radarrQueue?.totalRecords ?? 0;
    const lidarrQueueCount = lidarrQueue?.totalRecords ?? 0;
    const totalQueue = sonarrQueueCount + radarrQueueCount + lidarrQueueCount;

    // Combined recent queue items
    const recentQueueItems = useMemo(() => {
        const items: Array<{
            id: string; title: string; status: string; progress: number;
            size?: string; source: 'sonarr' | 'radarr' | 'lidarr';
        }> = [];

        const formatSize = (bytes: number) => bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;

        sonarrQueue?.records?.slice(0, 3).forEach((q) => {
            items.push({
                id: `s-${q.id}`, title: q.title, status: q.status ?? 'queued',
                progress: q.sizeleft && q.size ? ((1 - q.sizeleft / q.size) * 100) : 0,
                size: q.size ? formatSize(q.size) : undefined, source: 'sonarr',
            });
        });
        radarrQueue?.records?.slice(0, 3).forEach((q) => {
            items.push({
                id: `r-${q.id}`, title: q.title, status: q.status ?? 'queued',
                progress: q.sizeleft && q.size ? ((1 - q.sizeleft / q.size) * 100) : 0,
                size: q.size ? formatSize(q.size) : undefined, source: 'radarr',
            });
        });
        lidarrQueue?.records?.slice(0, 3).forEach((q) => {
            items.push({
                id: `l-${q.id}`, title: q.title, status: q.status ?? 'queued',
                progress: q.sizeleft && q.size ? ((1 - q.sizeleft / q.size) * 100) : 0,
                size: q.size ? formatSize(q.size) : undefined, source: 'lidarr',
            });
        });

        return items;
    }, [sonarrQueue, radarrQueue, lidarrQueue]);

    if (arrServers.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Animated.View entering={FadeInDown.duration(800)} style={styles.emptyContent}>
                    <Ionicons name="construct" size={64} color={styles.iconTertiary.color} />
                    <Text style={styles.emptyTitle}>No Management Servers</Text>
                    <Text style={styles.emptySubtitle}>
                        Add Sonarr, Radarr, or Lidarr to manage your media collection.
                    </Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => router.push('/server/add')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add-circle" size={20} color={styles.addButtonText.color} />
                        <Text style={styles.addButtonText}>Add Server</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }

    const getRoute = (type: ServerType) => {
        switch (type) {
            case 'sonarr': return '/sonarr/';
            case 'radarr': return '/radarr/';
            case 'lidarr': return '/lidarr/';
            default: return '/';
        }
    };

    const getQueueCount = (type: ServerType) => {
        switch (type) {
            case 'sonarr': return sonarrQueueCount;
            case 'radarr': return radarrQueueCount;
            case 'lidarr': return lidarrQueueCount;
            default: return 0;
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={false}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ['sonarr', 'radarr', 'lidarr'] })}
                    tintColor={styles.iconPrimary.color as string}
                />
            }
        >
            <TabSafeView>
                {/* Summary */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryValue}>{arrServers.length}</Text>
                        <Text style={styles.summaryLabel}>Services</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={[styles.summaryValue, styles.summaryValueHighlight]}>{totalQueue}</Text>
                        <Text style={styles.summaryLabel}>In Queue</Text>
                    </View>
                </Animated.View>

                {/* Service cards */}
                <Text style={styles.sectionTitle}>Connected Services</Text>
                {arrServers.map((server, index) => (
                    <ServiceCard
                        key={server.id}
                        type={server.type}
                        name={server.name}
                        queueCount={getQueueCount(server.type)}
                        onPress={() => router.push(getRoute(server.type) as any)}
                        delay={100 + index * 80}
                        styles={styles}
                    />
                ))}

                {/* Recent downloads */}
                {recentQueueItems.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Recent Downloads</Text>
                        {recentQueueItems.map((item) => (
                            <View key={item.id} style={styles.queueCardWrapper}>
                                <QueueCard
                                    title={item.title}
                                    status={item.status}
                                    progress={item.progress}
                                    size={item.size}
                                    source={item.source}
                                />
                            </View>
                        ))}
                    </>
                )}
            </TabSafeView>
        </ScrollView>
    );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Empty
    emptyContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    emptyContent: { alignItems: 'center', gap: Spacing.md },
    emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 22, color: colors.text },
    emptySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Spacing.radiusFull, gap: Spacing.sm, marginTop: Spacing.md },
    addButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textInverse },

    // Summary
    summaryRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.lg, marginBottom: Spacing.lg },
    summaryCard: { flex: 1, backgroundColor: colors.backgroundTertiary, borderRadius: Spacing.radiusMd, padding: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder },
    summaryValue: { fontFamily: 'Inter_700Bold', fontSize: 28, color: colors.text },
    summaryValueHighlight: { color: colors.badgeDownloading },
    summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textTertiary, marginTop: 4 },

    // Sections
    sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.text, paddingHorizontal: Spacing.screenPadding, marginTop: Spacing.xl, marginBottom: Spacing.md },

    // Service card
    serviceCard: { marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.sm, backgroundColor: colors.backgroundTertiary, borderRadius: Spacing.radiusMd, padding: Spacing.lg, borderLeftWidth: 3, borderWidth: 1, borderColor: colors.surfaceBorder },
    serviceCardHeader: { flexDirection: 'row', alignItems: 'center' },
    serviceIconBg: { width: 44, height: 44, borderRadius: Spacing.radiusMd, justifyContent: 'center', alignItems: 'center' },
    serviceInfo: { flex: 1, marginLeft: Spacing.md },
    serviceName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.text },
    serviceType: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textTertiary, textTransform: 'capitalize', marginTop: 2 },
    queueBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Spacing.radiusSm, alignSelf: 'flex-start' },
    queueBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 12 },

    // Queue
    queueCardWrapper: { paddingHorizontal: Spacing.screenPadding },

    // Color tokens for inline use
    iconPrimary: { color: colors.primary },
    iconTertiary: { color: colors.textTertiary },
});
