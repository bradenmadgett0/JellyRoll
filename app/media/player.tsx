/**
 * Video Player — Parent screen owning the player instance, progress tracking,
 * and playback reporting. Renders VideoPlayer + PlayerOverlay as children.
 */

import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Spacing } from "../../constants/Spacing";
import { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import {
  useJellyfinDetail,
  useJellyfinStreamUrl,
  usePlaybackReporter,
} from "../../services/hooks/useJellyfin";
import PlayerOverlay from "./playerOverlay";
import VideoPlayer from "./videoPlayer";

const TICKS_PER_SECOND = 10_000_000;
const POSITION_TRACK_MS = 1_000; // cache position every 1s
const PROGRESS_REPORT_MS = 10_000; // report to Jellyfin every 10s

// ─── Quality presets (bitrate in bps, null = no cap / direct stream) ──
export interface QualityPreset {
  label: string;
  maxBitrate: number | null;
}

export const QUALITY_PRESETS: QualityPreset[] = [
  { label: "Auto (Max)", maxBitrate: null },
  { label: "1080p - 20 Mbps", maxBitrate: 20_000_000 },
  { label: "1080p - 10 Mbps", maxBitrate: 10_000_000 },
  { label: "720p - 8 Mbps", maxBitrate: 8_000_000 },
  { label: "720p - 4 Mbps", maxBitrate: 4_000_000 },
  { label: "480p - 3 Mbps", maxBitrate: 3_000_000 },
  { label: "480p - 1.5 Mbps", maxBitrate: 1_500_000 },
  { label: "360p - 800 Kbps", maxBitrate: 800_000 },
];

export default function PlayerScreen() {
  const { itemId, startTicks: startTicksParam } = useLocalSearchParams<{
    itemId: string;
    startTicks?: string;
  }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const getStreamUrl = useJellyfinStreamUrl();
  const { data: item } = useJellyfinDetail(itemId);
  const { reportStart, reportProgress, reportStop } = usePlaybackReporter();

  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<QualityPreset>(
    QUALITY_PRESETS[0],
  );
  const [selectedAudioStreamIndex, setSelectedAudioStreamIndex] =
    useState<number>();

  const startTicks = startTicksParam ? parseInt(startTicksParam, 10) : 0;
  const startSeconds = startTicks > 0 ? startTicks / TICKS_PER_SECOND : 0;

  // Initialize with startTicks so we never fall back to 0
  const lastKnownTicks = useRef(startTicks);
  const hasSeeked = useRef(false);
  const positionTracker = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressReporter = useRef<ReturnType<typeof setInterval> | null>(null);

  // IMPORTANT: getStreamUrl is intentionally excluded from deps.
  // Each call creates a new JellyfinClient with a fresh random deviceId,
  // producing a different URL string. If included, every re-render would
  // change hlsUrl → useVideoPlayer would release the old player and create
  // a new one → playback resets to 0.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hlsUrl = useMemo(() => {
    if (!itemId) return null;
    const urls = getStreamUrl(itemId);
    return urls?.hlsUrl ?? null;
  }, [itemId]);

  const player = useVideoPlayer(hlsUrl ?? "", (p) => {
    p.loop = false;
    p.allowsExternalPlayback = true;
    if (startSeconds > 0 && !hasSeeked.current) {
      p.currentTime = startSeconds;
      hasSeeked.current = true;
    }
    p.play();
  });

  // ─── Position tracker (1s) — caches currentTime locally ─────
  useEffect(() => {
    if (!player) return;

    positionTracker.current = setInterval(() => {
      try {
        const ticks = Math.round(player.currentTime * TICKS_PER_SECOND);
        if (ticks > 0) lastKnownTicks.current = ticks;
      } catch {
        // player may have been released
      }
    }, POSITION_TRACK_MS);

    return () => {
      if (positionTracker.current) {
        clearInterval(positionTracker.current);
        positionTracker.current = null;
      }
    };
  }, [player]);

  // ─── Report playback start ──────────────────────────────────
  useEffect(() => {
    if (!itemId || !hlsUrl) return;
    reportStart(itemId, startTicks);
  }, [itemId, hlsUrl, startTicks, reportStart]);

  // ─── Report progress to Jellyfin (10s) ──────────────────────
  useEffect(() => {
    if (!itemId || !player) return;

    progressReporter.current = setInterval(() => {
      reportProgress(itemId, lastKnownTicks.current, !player.playing);
    }, PROGRESS_REPORT_MS);

    return () => {
      if (progressReporter.current) {
        clearInterval(progressReporter.current);
        progressReporter.current = null;
      }
    };
  }, [itemId, player, reportProgress]);

  // ─── Report stop on unmount (uses cached ticks, never 0) ────
  useEffect(() => {
    return () => {
      if (itemId && lastKnownTicks.current > 0) {
        reportStop(itemId, lastKnownTicks.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // ─── Overlay toggle ─────────────────────────────────────────
  const toggleOverlay = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  // ─── Quality change handler ──────────────────────────────────
  const handleQualityChange = useCallback(
    (preset: QualityPreset) => {
      setSelectedQuality(preset);
      if (!itemId || !player) return;
      // Remember current position
      const resumeTime = player.currentTime;
      // Build new URL with selected bitrate
      const urls = getStreamUrl(
        itemId,
        preset.maxBitrate,
        selectedAudioStreamIndex,
      );
      if (!urls?.hlsUrl) return;
      // Replace the source and seek back
      player.replace(urls.hlsUrl);
      // Seek after a brief delay to let the new source initialize
      setTimeout(() => {
        try {
          player.currentTime = resumeTime;
          player.play();
        } catch {
          /* player may not be ready */
        }
      }, 500);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [itemId, player, getStreamUrl],
  );

  // ─── Audio stream change handler ────────────────────────────
  const handleAudioStreamChange = useCallback(
    (audioStreamIndex: number) => {
      setSelectedAudioStreamIndex(audioStreamIndex);
      if (!itemId || !player) return;
      // Remember current position
      const resumeTime = player.currentTime;
      // Build new URL with selected bitrate
      const urls = getStreamUrl(
        itemId,
        selectedQuality.maxBitrate,
        audioStreamIndex,
      );
      if (!urls?.hlsUrl) return;
      // Replace the source and seek back
      player.replace(urls.hlsUrl);
      // Seek after a brief delay to let the new source initialize
      setTimeout(() => {
        try {
          player.currentTime = resumeTime;
          player.play();
        } catch {
          /* player may not be ready */
        }
      }, 500);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [itemId, player, getStreamUrl],
  );

  // Memoize VideoPlayer to prevent re-renders from overlay toggle
  const videoView = useMemo(
    () => <VideoPlayer player={player} toggleOverlay={toggleOverlay} />,
    [player, toggleOverlay],
  );

  // ─── Error state ────────────────────────────────────────────
  if (!itemId || !hlsUrl) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons
          name="alert-circle"
          size={48}
          color={styles.iconError.color}
        />
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
      {videoView}
      <PlayerOverlay
        player={player}
        item={item}
        showOverlay={showOverlay}
        toggleOverlay={toggleOverlay}
        selectedQuality={selectedQuality}
        onQualityChange={handleQualityChange}
        onAudioStreamChange={handleAudioStreamChange}
      />
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000",
    },
    errorContainer: {
      flex: 1,
      backgroundColor: "#000",
      justifyContent: "center",
      alignItems: "center",
      gap: Spacing.md,
    },
    errorText: {
      color: colors.error,
      fontSize: 16,
      fontFamily: "Inter_500Medium",
    },
    backBtn: {
      backgroundColor: colors.backgroundTertiary,
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.md,
      borderRadius: Spacing.radiusMd,
      marginTop: Spacing.md,
    },
    backBtnText: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    iconError: { color: colors.error },
  });
