/**
 * Video Player — Parent screen owning the player instance, progress tracking,
 * and playback reporting. Renders VideoPlayer + PlayerOverlay as children.
 */

import {
  buildQualityPresets,
  DEFAULT_QUALITY_PRESET,
  QualityPreset,
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
  useJellyfinDetail,
  useJellyfinStreamUrl,
} from "../../services/hooks/useJellyfin";
import { useMediaSettings } from "../../services/hooks/useMediaSettings";
import { usePlaybackReporting } from "../../services/hooks/usePlaybackReporting";
import { usePlaybackSession } from "../../services/hooks/usePlaybackSession";
import PlayerOverlay from "./playerOverlay";
import VideoPlayer from "./videoPlayer";

export default function PlayerScreen() {
  const { itemId, startTicks: startTicksParam } = useLocalSearchParams<{
    itemId: string;
    startTicks?: string;
  }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { data: item } = useJellyfinDetail(itemId);

  const startTicks = startTicksParam ? parseInt(startTicksParam, 10) : 0;
  const startSeconds = startTicks > 0 ? ticksToSeconds(startTicks) : 0;

  const {
    session: playbackSession,
    error: playbackError,
  } = usePlaybackSession(itemId, { startTicks });
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

  const hasSeeked = useRef(false);

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

  const { killTranscode } = usePlaybackReporting({
    player,
    itemId,
    session: playbackSession,
    startTicks,
    audioStreamIndex: selectedAudioStreamIndex,
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

  // ─── Overlay toggle ─────────────────────────────────────────
  const toggleOverlay = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  const hideOverlay = useCallback(() => {
    setShowOverlay(false);
  }, []);

  // ─── Stream switch (quality or audio track) ─────────────────
  // Both kinds of switch are the same six steps — remember position, build
  // URL, kill transcode, replaceAsync, seek back, play — differing only in
  // which URL param changes. Callers always pass both values explicitly
  // (rather than "omit to keep current") since `bitrate: null` is itself a
  // meaningful value (uncapped) and must not collapse into a default.
  const switchStream = useCallback(
    async ({
      bitrate,
      audioStreamIndex,
    }: {
      bitrate: number | null;
      audioStreamIndex: number | undefined;
    }) => {
      if (!itemId || !player) return;
      // Remember current position
      const resumeTime = player.currentTime;
      // Build new URL with the selected bitrate/audio track
      const urls = getStreamUrl(itemId, bitrate, audioStreamIndex);
      if (!urls?.hlsUrl) return;
      // Kill old transcode before starting a new one
      await killTranscode();
      // Replace the source and seek back
      await player.replaceAsync(urls.hlsUrl);
      player.currentTime = resumeTime;
      player.play();
    },
    [itemId, player, getStreamUrl, killTranscode],
  );

  // ─── Quality change handler ──────────────────────────────────
  const handleQualityChange = useCallback(
    (preset: QualityPreset) => {
      setSelectedQuality(preset);
      setMediaSettings({ qualityPreset: preset.label });
      switchStream({
        bitrate: preset.maxBitrate,
        audioStreamIndex: selectedAudioStreamIndex,
      });
    },
    [setMediaSettings, switchStream, selectedAudioStreamIndex],
  );

  // ─── Audio stream change handler ────────────────────────────
  const handleAudioStreamChange = useCallback(
    (audioStreamIndex: number) => {
      if (audioStreamIndex === selectedAudioStreamIndex) return;
      setSelectedAudioStreamIndex(audioStreamIndex);
      setMediaSettings({ audioStreamIndex });
      switchStream({ bitrate: selectedQuality.maxBitrate, audioStreamIndex });
    },
    [selectedAudioStreamIndex, selectedQuality, setMediaSettings, switchStream],
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
