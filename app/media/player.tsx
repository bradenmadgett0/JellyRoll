/**
 * Video Player — Parent screen owning the player instance, progress tracking,
 * and playback reporting. Renders VideoPlayer + PlayerOverlay as children.
 */

import {
  buildQualityPresets,
  DEFAULT_QUALITY_PRESET,
  QualityPreset,
  secondsToTicks,
  ticksToSeconds,
} from "@/types/player";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  JellyfinPlaybackSession,
  useJellyfinDetail,
  useJellyfinPlaybackInfo,
  useJellyfinStreamUrl,
  usePlaybackReporter,
} from "../../services/hooks/useJellyfin";
import { useMediaSettings } from "../../services/hooks/useMediaSettings";
import { JellyfinPlaybackErrorCode } from "../../types/jellyfin";
import PlayerOverlay from "./playerOverlay";
import VideoPlayer from "./videoPlayer";

const POSITION_TRACK_MS = 1_000; // cache position every 1s
const PROGRESS_REPORT_MS = 10_000; // report to Jellyfin every 10s

const PLAYBACK_ERROR_MESSAGES: Record<JellyfinPlaybackErrorCode, string> = {
  NotAllowed: "You don't have permission to play this item.",
  NoCompatibleStream: "No compatible stream could be found for this item.",
  RateLimitExceeded: "Too many active streams. Try again in a moment.",
};

export default function PlayerScreen() {
  const { itemId, startTicks: startTicksParam } = useLocalSearchParams<{
    itemId: string;
    startTicks?: string;
  }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { data: item } = useJellyfinDetail(itemId);
  const getPlaybackInfo = useJellyfinPlaybackInfo();
  const [playbackSession, setPlaybackSession] =
    useState<JellyfinPlaybackSession | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const { reportStart, reportProgress, reportStop, killTranscode } =
    usePlaybackReporter(playbackSession ?? undefined);
  const getStreamUrl = useJellyfinStreamUrl(
    playbackSession?.playSessionId,
    playbackSession?.mediaSourceId,
  );
  const { get: getMediaSettings, set: setMediaSettings, serverId } =
    useMediaSettings(itemId);

  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<QualityPreset>(
    DEFAULT_QUALITY_PRESET,
  );
  const [selectedAudioStreamIndex, setSelectedAudioStreamIndex] =
    useState<number>();

  // Single source of truth for the preset list — both the parent (URL
  // building) and the overlay (picker UI) read from this.
  const qualityPresets = useMemo(
    () => buildQualityPresets(item?.MediaSources?.[0]?.Bitrate),
    [item],
  );

  const startTicks = startTicksParam ? parseInt(startTicksParam, 10) : 0;
  const startSeconds = startTicks > 0 ? ticksToSeconds(startTicks) : 0;

  // Initialize with startTicks so we never fall back to 0
  const lastKnownTicks = useRef(startTicks);
  const hasSeeked = useRef(false);
  const positionTracker = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressReporter = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Negotiate the playback session (PlaybackInfo handshake) ──
  // Runs once per itemId: mints the real PlaySessionId and selects the
  // MediaSource to play, both required before a stream URL can be built.
  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    setPlaybackSession(null);
    setPlaybackError(null);

    getPlaybackInfo(itemId, { startTimeTicks: startTicks })
      .then((info) => {
        if (cancelled) return;
        if (info.ErrorCode) {
          setPlaybackError(
            PLAYBACK_ERROR_MESSAGES[info.ErrorCode] ??
              "This item can't be played right now.",
          );
          return;
        }
        const source = info.MediaSources?.[0];
        if (!source) {
          setPlaybackError("No compatible media source was found.");
          return;
        }
        setPlaybackSession({
          playSessionId: info.PlaySessionId,
          mediaSourceId: source.Id,
          // We only ever request /master.m3u8 (HLS), never the raw /stream
          // endpoint, so true DirectPlay never happens through this path.
          playMethod: source.SupportsDirectStream
            ? "DirectStream"
            : "Transcode",
          defaultAudioStreamIndex: source.DefaultAudioStreamIndex,
        });
      })
      .catch(() => {
        if (!cancelled) setPlaybackError("Unable to start playback.");
      });

    return () => {
      cancelled = true;
    };
  }, [itemId, startTicks, getPlaybackInfo]);

  // getStreamUrl is now a stable useCallback (see useJellyfinStreamUrl) that
  // only changes identity when the client or the negotiated session does —
  // not on unrelated re-renders — so it's safe to depend on honestly here.
  const hlsUrl = useMemo(() => {
    if (!itemId || !playbackSession) return null;
    const urls = getStreamUrl(itemId);
    return urls?.hlsUrl ?? null;
  }, [itemId, playbackSession, getStreamUrl]);

  const player = useVideoPlayer(hlsUrl ?? "", (p) => {
    p.loop = false;
    p.allowsExternalPlayback = true;
    if (startSeconds > 0 && !hasSeeked.current) {
      p.currentTime = startSeconds;
      hasSeeked.current = true;
    }
    p.play();
  });

  // ─── Resolve initial quality + audio selection (once, after player is ready) ──
  // Establishes what's actually playing so the overlay's labels never
  // disagree with the stream: audio defaults to the negotiated source's
  // DefaultAudioStreamIndex (what the server itself would pick), falling
  // back to scanning for IsDefault, only overridden by a saved preference.
  // The stream is only replaced when a saved setting requires it — the
  // resolved *default* is what the initial URL already got without us
  // asking, so just reflecting it in state doesn't need a restart.
  const hasAppliedSaved = useRef(false);
  useEffect(() => {
    if (
      !player ||
      !item ||
      !serverId ||
      !playbackSession ||
      hasAppliedSaved.current
    )
      return;
    hasAppliedSaved.current = true;

    const saved = getMediaSettings();

    const audioStreams =
      item.MediaSources?.[0]?.MediaStreams?.filter(
        (s) => s.Type === "Audio",
      ) ?? [];
    const defaultAudioIndex =
      playbackSession.defaultAudioStreamIndex ??
      audioStreams.find((s) => s.IsDefault)?.Index ??
      audioStreams[0]?.Index;

    let newBitrate: number | null = DEFAULT_QUALITY_PRESET.maxBitrate;
    let newAudioIndex: number | undefined = defaultAudioIndex;
    let needsReplace = false;

    if (saved?.qualityPreset) {
      const match = qualityPresets.find((p) => p.label === saved.qualityPreset);
      if (match) {
        setSelectedQuality(match);
        newBitrate = match.maxBitrate;
        needsReplace = true;
      }
    }
    if (saved?.audioStreamIndex !== undefined) {
      newAudioIndex = saved.audioStreamIndex;
      needsReplace = true;
    }
    setSelectedAudioStreamIndex(newAudioIndex);

    if (needsReplace) {
      const urls = getStreamUrl(itemId, newBitrate, newAudioIndex);
      if (urls?.hlsUrl) {
        (async () => {
          await killTranscode();
          await player.replaceAsync(urls.hlsUrl);
          if (startSeconds > 0) player.currentTime = startSeconds;
          player.play();
        })();
      }
    }
  }, [
    player,
    item,
    serverId,
    playbackSession,
    itemId,
    startSeconds,
    qualityPresets,
    getMediaSettings,
    getStreamUrl,
    killTranscode,
  ]);

  // ─── Position tracker (1s) — caches currentTime locally ─────
  useEffect(() => {
    if (!player) return;

    positionTracker.current = setInterval(() => {
      try {
        const ticks = secondsToTicks(player.currentTime);
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
      reportProgress(
        itemId,
        lastKnownTicks.current,
        !player.playing,
        selectedAudioStreamIndex,
      );
    }, PROGRESS_REPORT_MS);

    return () => {
      if (progressReporter.current) {
        clearInterval(progressReporter.current);
        progressReporter.current = null;
      }
    };
  }, [itemId, player, reportProgress, selectedAudioStreamIndex]);

  // TODO: Consider pausing the player explicitly before unmount to prevent
  // brief background streaming while useVideoPlayer tears down the native instance.

  // ─── Report stop on unmount (uses cached ticks; 0 is a real position) ──
  // reportStop's and killTranscode's identities change once the PlaybackInfo
  // handshake resolves (they close over the negotiated session), so we track
  // them in refs rather than the effect's deps — otherwise the unmount
  // cleanup would fire a real stop report the moment the session becomes
  // available, not on unmount.
  const reportStopRef = useRef(reportStop);
  const killTranscodeRef = useRef(killTranscode);
  useEffect(() => {
    reportStopRef.current = reportStop;
    killTranscodeRef.current = killTranscode;
  }, [reportStop, killTranscode]);

  useEffect(() => {
    return () => {
      if (!itemId) return;
      // Independent calls, not chained: reportStop failing must not stop the
      // transcode from being killed. usePlaybackReporter already no-ops
      // cleanly when no session was ever negotiated.
      reportStopRef.current(itemId, lastKnownTicks.current);
      killTranscodeRef.current();
    };
  }, [itemId]);

  // ─── Overlay toggle ─────────────────────────────────────────
  const toggleOverlay = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  const hideOverlay = useCallback(() => {
    setShowOverlay(false);
  }, []);

  // ─── Quality change handler ──────────────────────────────────
  const handleQualityChange = useCallback(
    async (preset: QualityPreset) => {
      setSelectedQuality(preset);
      setMediaSettings({ qualityPreset: preset.label });
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
      // Kill old transcode before starting a new one
      await killTranscode();
      // Replace the source and seek back
      await player.replaceAsync(urls.hlsUrl);
      player.currentTime = resumeTime;
      player.play();
    },
    [
      itemId,
      player,
      getStreamUrl,
      killTranscode,
      setMediaSettings,
      selectedAudioStreamIndex,
    ],
  );

  // ─── Audio stream change handler ────────────────────────────
  const handleAudioStreamChange = useCallback(
    async (audioStreamIndex: number) => {
      if (audioStreamIndex === selectedAudioStreamIndex) return;
      setSelectedAudioStreamIndex(audioStreamIndex);
      setMediaSettings({ audioStreamIndex });
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
      // Kill old transcode before starting a new one
      await killTranscode();
      // Replace the source and seek back
      await player.replaceAsync(urls.hlsUrl);
      player.currentTime = resumeTime;
      player.play();
    },
    [
      itemId,
      player,
      getStreamUrl,
      killTranscode,
      setMediaSettings,
      selectedQuality,
      selectedAudioStreamIndex,
    ],
  );

  // Memoize VideoPlayer to prevent re-renders from overlay toggle
  const videoView = useMemo(
    () => <VideoPlayer player={player} toggleOverlay={toggleOverlay} />,
    [player, toggleOverlay],
  );

  // ─── Error state ────────────────────────────────────────────
  if (!itemId || playbackError) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons
          name="alert-circle"
          size={48}
          color={styles.iconError.color}
        />
        <Text style={styles.errorText}>
          {playbackError ?? "Unable to load video stream"}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Loading state (awaiting the PlaybackInfo handshake) ────
  if (!hlsUrl) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={styles.iconPrimary.color} />
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
        itemId={itemId}
        showOverlay={showOverlay}
        hideOverlay={hideOverlay}
        qualityPresets={qualityPresets}
        selectedQuality={selectedQuality}
        onQualityChange={handleQualityChange}
        selectedAudioStreamIndex={selectedAudioStreamIndex}
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
    iconPrimary: { color: colors.primary },
  });
