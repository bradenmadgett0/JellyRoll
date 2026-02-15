/**
 * QueueCard — Download progress card for queue items
 */

import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { SOURCE_COLORS, SOURCE_ICONS } from '../../constants/Sources';
import { Spacing } from '../../constants/Spacing';

interface QueueCardProps {
    title: string;
    /** e.g. "S01E05" or "Movie (2024)" */
    subtitle?: string;
    status: string;
    progress: number;
    size?: string;
    timeLeft?: string;
    quality?: string;
    /** sonarr, radarr, lidarr */
    source?: 'sonarr' | 'radarr' | 'lidarr';
}



function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
        case 'downloading':
            return Colors.badgeDownloading;
        case 'completed':
        case 'imported':
            return Colors.success;
        case 'failed':
        case 'warning':
            return Colors.error;
        case 'paused':
            return Colors.warning;
        default:
            return Colors.textSecondary;
    }
}

function QueueCardBase({
    title,
    subtitle,
    status,
    progress,
    size,
    timeLeft,
    quality,
    source,
}: QueueCardProps) {
    const sourceColor = source ? SOURCE_COLORS[source] : Colors.primary;
    const statusColor = getStatusColor(status);

    return (
        <View style={[styles.container, { borderLeftColor: sourceColor }]}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {source && (
                        <Ionicons
                            name={SOURCE_ICONS[source]}
                            size={14}
                            color={sourceColor}
                            style={{ marginRight: 6 }}
                        />
                    )}
                    <Text style={styles.title} numberOfLines={1}>
                        {title}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {status}
                    </Text>
                </View>
            </View>

            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%`, backgroundColor: sourceColor }]} />
            </View>

            {/* Info row */}
            <View style={styles.infoRow}>
                <Text style={styles.infoText}>{Math.round(progress)}%</Text>
                {size && <Text style={styles.infoText}>{size}</Text>}
                {quality && <Text style={styles.infoText}>{quality}</Text>}
                {timeLeft && (
                    <Text style={styles.infoText}>
                        <Ionicons name="time-outline" size={10} color={Colors.textTertiary} />{' '}
                        {timeLeft}
                    </Text>
                )}
            </View>
        </View>
    );
}

export const QueueCard = memo(QueueCardBase);

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.backgroundTertiary,
        borderRadius: Spacing.radiusMd,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.surfaceBorder,
        borderLeftWidth: 3,
        marginBottom: Spacing.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: Spacing.sm,
    },
    title: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        color: Colors.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Spacing.radiusSm,
    },
    statusText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    progressContainer: {
        height: 4,
        backgroundColor: Colors.surfaceBorder,
        borderRadius: 2,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    infoRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    infoText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        color: Colors.textTertiary,
    },
});
