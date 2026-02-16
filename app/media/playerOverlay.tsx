/**
 * PlayerOverlay — Full custom video control overlay.
 *
 * Top bar:    Back button  ·  Title  ·  AirPlay
 * Center:    Skip -10s  ·  Play/Pause  ·  Skip +10s
 * Bottom:    Elapsed  ·  Scrubber  ·  Remaining  ·  Fullscreen
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { VideoAirPlayButton, VideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    GestureResponderEvent,
    LayoutChangeEvent,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Spacing } from '../../constants/Spacing';
import { JellyfinItem } from '../../types/jellyfin';

// ─── Time formatting ────────────────────────────────────────
function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function formatBitrate(bps: number | null): string | null {
    if (!bps || bps <= 0) return null;
    if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
    if (bps >= 1_000) return `${Math.round(bps / 1_000)} Kbps`;
    return `${bps} bps`;
}

// ─── Props ──────────────────────────────────────────────────
interface PlayerOverlayProps {
    player: VideoPlayer;
    item?: JellyfinItem | null;
    showOverlay: boolean;
    toggleOverlay: () => void;
}

const SCRUBBER_UPDATE_MS = 500;
const AUTO_HIDE_MS = 4000;

export default function PlayerOverlay({
    player,
    item,
    showOverlay,
    toggleOverlay,
}: PlayerOverlayProps) {
    const router = useRouter();

    const [isPlaying, setIsPlaying] = useState(player.playing);
    const [currentTime, setCurrentTime] = useState(player.currentTime);
    const [duration, setDuration] = useState(player.duration);
    const [bitrate, setBitrate] = useState<number | null>(null);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubberWidth, setScrubberWidth] = useState(0);

    const scrubRef = useRef(currentTime);
    const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Poll player state ──────────────────────────────────
    useEffect(() => {
        if (!player) return;
        const interval = setInterval(() => {
            try {
                setIsPlaying(player.playing);
                if (!isScrubbing) {
                    setCurrentTime(player.currentTime);
                }
                if (player.duration > 0) {
                    setDuration(player.duration);
                }
                // Read bitrate from current video track
                try {
                    const track = (player as any).videoTrack;
                    if (track?.bitrate) setBitrate(track.bitrate);
                } catch { /* not available */ }
            } catch {
                // player may have been released
            }
        }, SCRUBBER_UPDATE_MS);

        return () => clearInterval(interval);
    }, [player, isScrubbing]);

    // ─── Auto-hide overlay ──────────────────────────────────
    useEffect(() => {
        if (showOverlay && !isScrubbing) {
            autoHideTimer.current = setTimeout(() => toggleOverlay(), AUTO_HIDE_MS);
            return () => {
                if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
            };
        }
    }, [showOverlay, isScrubbing, toggleOverlay]);

    // ─── Controls ───────────────────────────────────────────
    const handlePlayPause = useCallback(() => {
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
        setIsPlaying(!player.playing);
    }, [player]);

    const handleSkipBack = useCallback(() => {
        player.seekBy(-10);
    }, [player]);

    const handleSkipForward = useCallback(() => {
        player.seekBy(10);
    }, [player]);

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    // ─── Scrubber touch handling ────────────────────────────
    const handleScrubberLayout = useCallback((e: LayoutChangeEvent) => {
        setScrubberWidth(e.nativeEvent.layout.width);
    }, []);

    const seekToPosition = useCallback(
        (pageX: number, trackX: number) => {
            if (scrubberWidth <= 0 || duration <= 0) return;
            const offsetX = pageX - trackX;
            const pct = Math.max(0, Math.min(1, offsetX / scrubberWidth));
            const seekTime = pct * duration;
            scrubRef.current = seekTime;
            setCurrentTime(seekTime);
        },
        [scrubberWidth, duration],
    );

    const scrubberTrackRef = useRef<View>(null);
    const trackXRef = useRef(0);

    const handleScrubStart = useCallback(
        (e: GestureResponderEvent) => {
            setIsScrubbing(true);
            // Reset auto-hide
            if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
            // Measure the track position once
            scrubberTrackRef.current?.measureInWindow((x) => {
                trackXRef.current = x;
                seekToPosition(e.nativeEvent.pageX, x);
            });
        },
        [seekToPosition],
    );

    const handleScrubMove = useCallback(
        (e: GestureResponderEvent) => {
            seekToPosition(e.nativeEvent.pageX, trackXRef.current);
        },
        [seekToPosition],
    );

    const handleScrubEnd = useCallback(() => {
        player.currentTime = scrubRef.current;
        setIsScrubbing(false);
    }, [player]);

    // ─── Derived values ─────────────────────────────────────
    const progress = duration > 0 ? currentTime / duration : 0;
    const remaining = duration - currentTime;

    if (!showOverlay) return null;

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.overlay}
            pointerEvents="box-none"
        >
            {/* Gradient scrim */}
            <View style={styles.scrimTop} />
            <View style={styles.scrimBottom} />

            {/* ─── Top Bar ─────────────────────────────────── */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={handleBack} style={styles.controlBtn} hitSlop={12}>
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

                {Platform.OS === 'ios' && <VideoAirPlayButton />}
            </View>

            {/* ─── Center Controls ─────────────────────────── */}
            <View style={styles.centerControls}>
                <TouchableOpacity onPress={handleSkipBack} style={styles.skipBtn} hitSlop={16}>
                    <Ionicons name="play-back" size={28} color="#fff" />
                    <Text style={styles.skipLabel}>10</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePlayPause} style={styles.playPauseBtn} hitSlop={16}>
                    <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={38}
                        color="#fff"
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSkipForward} style={styles.skipBtn} hitSlop={16}>
                    <Ionicons name="play-forward" size={28} color="#fff" />
                    <Text style={styles.skipLabel}>10</Text>
                </TouchableOpacity>
            </View>

            {/* ─── Bottom Bar ──────────────────────────────── */}
            <View style={styles.bottomBar}>
                {/* Time labels + scrubber */}
                <View style={styles.scrubberRow}>
                    <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>

                    <View
                        ref={scrubberTrackRef}
                        style={styles.scrubberTrack}
                        onLayout={handleScrubberLayout}
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                        onResponderGrant={handleScrubStart}
                        onResponderMove={handleScrubMove}
                        onResponderRelease={handleScrubEnd}
                        onResponderTerminate={handleScrubEnd}
                    >
                        {/* Progress fill */}
                        <View style={[styles.scrubberFill, { width: `${progress * 100}%` }]} />
                        {/* Thumb */}
                        <View
                            style={[
                                styles.scrubberThumb,
                                { left: `${progress * 100}%` },
                            ]}
                        />
                    </View>

                    <Text style={styles.timeLabel}>-{formatTime(remaining)}</Text>
                </View>

                {/* Bitrate indicator */}
                {formatBitrate(bitrate) && (
                    <Text style={styles.bitrateLabel}>{formatBitrate(bitrate)}</Text>
                )}
            </View>
        </Animated.View>
    );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        zIndex: 10,
    },

    // Gradient scrims
    scrimTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: 'transparent',
        // Simulated gradient via opacity
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    scrimBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 140,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },

    // Top bar
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 54,
        paddingHorizontal: Spacing.screenPadding,
        paddingBottom: Spacing.md,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    controlBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: Spacing.sm,
        alignItems: 'center',
    },
    title: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15,
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
        textAlign: 'center',
    },

    // Center controls
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 48,
    },
    skipBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 56,
    },
    skipLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
        marginTop: -4,
    },
    playPauseBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Bottom bar
    bottomBar: {
        paddingHorizontal: Spacing.screenPadding,
        paddingBottom: 40,
    },
    scrubberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    timeLabel: {
        fontFamily: 'Inter_500Medium',
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        minWidth: 45,
        textAlign: 'center',
    },
    scrubberTrack: {
        flex: 1,
        height: 32,
        justifyContent: 'center',
    },
    scrubberFill: {
        position: 'absolute',
        left: 0,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#fff',
    },
    scrubberThumb: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#fff',
        marginLeft: -7,
        top: 9,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    bitrateLabel: {
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'right',
        marginTop: 4,
    },
});