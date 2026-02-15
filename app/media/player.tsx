/**
 * Video Player — expo-video HLS streaming player
 */

import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Dimensions, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { useJellyfinDetail, useJellyfinStreamUrl } from '../../services/hooks/useJellyfin';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PlayerScreen() {
    const { itemId } = useLocalSearchParams<{ itemId: string }>();
    const router = useRouter();
    const getStreamUrl = useJellyfinStreamUrl();
    const { data: item } = useJellyfinDetail(itemId);

    const [showControls, setShowControls] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const urls = itemId ? getStreamUrl(itemId) : null;
    const hlsUrl = urls?.hlsUrl;

    const player = useVideoPlayer(hlsUrl ?? '', (p) => {
        p.loop = false;
        p.play();
    });

    // Auto-hide controls after 3 seconds
    useEffect(() => {
        if (showControls) {
            const timer = setTimeout(() => setShowControls(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [showControls]);

    if (!itemId || !hlsUrl) {
        return (
            <View style={styles.errorContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <Ionicons name="alert-circle" size={48} color={Colors.error} />
                <Text style={styles.errorText}>Unable to load video stream</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar hidden />

            <TouchableOpacity
                style={styles.videoTouchable}
                activeOpacity={1}
                onPress={() => setShowControls(!showControls)}
            >
                <VideoView
                    style={styles.video}
                    player={player}
                    allowsFullscreen
                    allowsPictureInPicture
                    nativeControls={true}
                />
            </TouchableOpacity>

            {/* Custom overlay controls */}
            {showControls && (
                <View style={styles.controlsOverlay} pointerEvents="box-none">
                    {/* Top bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.controlBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title} numberOfLines={1}>
                                {item?.Name ?? 'Playing...'}
                            </Text>
                            {item?.Type === 'Episode' && item.SeriesName && (
                                <Text style={styles.subtitle}>
                                    {item.SeriesName} · S{item.ParentIndexNumber}E{item.IndexNumber}
                                </Text>
                            )}
                        </View>
                        <View style={{ width: 40 }} />
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoTouchable: {
        flex: 1,
    },
    video: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: Spacing.screenPadding,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingBottom: Spacing.md,
    },
    controlBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: Spacing.md,
    },
    title: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: '#fff',
    },
    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },

    // Error
    errorContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
    },
    errorText: {
        color: Colors.error,
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
    },
    backBtn: {
        backgroundColor: Colors.backgroundTertiary,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.md,
        borderRadius: Spacing.radiusMd,
        marginTop: Spacing.md,
    },
    backBtnText: {
        color: Colors.primary,
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15,
    },
});
