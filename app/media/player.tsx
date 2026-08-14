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
import { useEventListener } from "expo";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  useVideoPlayer,
  VideoPlayer as VideoPlayerInstance,
} from "expo-video";
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

/**
 * Resolves once the player has loaded enough of its current source to accept
 * a seek — setting `currentTime` before this (e.g. synchronously in
 * useVideoPlayer's setup callback, or immediately after replaceAsync) is
 * silently dropped, since the player has nothing loaded yet to seek within.
 * Also resolves on 'error' so a failed load can't hang the caller forever.
 */
function waitForReady(player: VideoPlayerInstance): Promise<void> {
  if (player.status === "readyToPlay" || player.status === "error") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const subscription = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay" || status === "error") {
        subscription.remove();
        resolve();
      }
    });
  });
}

export default function PlayerScreen() {
  const { itemId, startTicks: startTicksParam } = useLocalSearchParams<{
    itemId: string;
    startTicks?: string;
  }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { data: item } = useJellyfinDetail(itemId);
  const { get: getMediaSettings, set: setMediaSettings } =
    useMediaSettings(itemId);

  const startTicks = startTicksParam ? parseInt(startTicksParam, 10) : 0;
  const startSeconds = startTicks > 0 ? ticksToSeconds(startTicks) : 0;
  // Guards the one-time resume-position seek once the player is ready (below).
  const hasSeeked = useRef(false);

  const [showOverlay, setShowOverlay] = useState(true);

  // ─── Resolve saved settings synchronously, before negotiating ───────────
  // Read once at mount (not gated on the item detail query, so a slow/failed
  // detail fetch can never block playback from starting) so the very FIRST
  // PlaybackInfo handshake already carries the right bitrate/audio track.
  // The old approach applied saved settings in an effect that ran after the
  // handshake and after playback had already begun at defaults — every
  // launch with a non-default saved quality did negotiate → play → kill →
  // negotiate again → replace: two transcode starts for one launch. Only
  // the dynamic "Max - <source bitrate>" preset can't be matched yet here
  // (its label depends on the item detail query, which may not have
  // resolved); that one narrow case falls back to the default and
  // self-corrects the next time it's saved.
  const [initialSettings] = useState(() => getMediaSettings());
  const [selectedQuality, setSelectedQuality] = useState<QualityPreset>(() => {
    if (initialSettings?.qualityPreset) {
      const match = buildQualityPresets().find(
        (p) => p.label === initialSettings.qualityPreset,
      );
      if (match) return match;
    }
    return DEFAULT_QUALITY_PRESET;
  });
  const [selectedAudioStreamIndex, setSelectedAudioStreamIndex] = useState<
    number | undefined
  >(initialSettings?.audioStreamIndex);

  const {
    session: playbackSession,
    error: playbackError,
  } = usePlaybackSession(itemId, {
    startTicks,
    maxStreamingBitrate: selectedQuality.maxBitrate ?? undefined,
    audioStreamIndex: selectedAudioStreamIndex,
  });
  const getStreamUrl = useJellyfinStreamUrl(
    playbackSession?.playSessionId,
    playbackSession?.mediaSourceId,
  );

  // Single source of truth for the preset list — both the parent (URL
  // building) and the overlay (picker UI) read from this. Reactive, unlike
  // the one-time resolution above, so it picks up the dynamic "Max" entry
  // once the item detail loads.
  const qualityPresets = useMemo(
    () => buildQualityPresets(item?.MediaSources?.[0]?.Bitrate),
    [item],
  );

  // Once the session negotiates, reflect the server's chosen default audio
  // track in state (for the picker label) if there was no saved override —
  // the initial URL already got this track since we didn't constrain
  // audioStreamIndex, so no stream replace is needed here, just display.
  useEffect(() => {
    if (!playbackSession || selectedAudioStreamIndex !== undefined) return;
    if (playbackSession.defaultAudioStreamIndex !== undefined) {
      setSelectedAudioStreamIndex(playbackSession.defaultAudioStreamIndex);
      return;
    }
    const audioStreams =
      item?.MediaSources?.[0]?.MediaStreams?.filter(
        (s) => s.Type === "Audio",
      ) ?? [];
    const fallback =
      audioStreams.find((s) => s.IsDefault)?.Index ?? audioStreams[0]?.Index;
    if (fallback !== undefined) setSelectedAudioStreamIndex(fallback);
  }, [playbackSession, selectedAudioStreamIndex, item]);

  // NOTE: this previously also baked `startTicks` into the URL so the
  // server would start the transcode already at the resume point, avoiding
  // a client-side seek into un-transcoded content. That broke playback
  // outright against the live server (see the NOTE on getHlsStreamUrl), so
  // it's reverted to the local-seek approach below pending a known-correct
  // way to request a server-side start offset.
  //
  // selectedQuality/selectedAudioStreamIndex are intentionally excluded from
  // deps: they're read once here, at the moment the session first becomes
  // available (already resolved from saved settings before that, per above)
  // to build the initial URL. Later quality/audio switches go through
  // switchStream's replaceAsync path, not through rebuilding this memo, so
  // hlsUrl intentionally goes stale after a switch — P11 unifies URL state
  // with the session.
  const hlsUrl = useMemo(() => {
    if (!itemId || !playbackSession) return null;
    const urls = getStreamUrl(
      itemId,
      selectedQuality.maxBitrate,
      selectedAudioStreamIndex,
    );
    return urls?.hlsUrl ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, playbackSession, getStreamUrl]);

  const player = useVideoPlayer(hlsUrl ?? "", (p) => {
    p.loop = false;
    p.allowsExternalPlayback = true;
    p.play();
  });

  // Seek to the resume position once the player has actually loaded the
  // source. Setting currentTime synchronously in useVideoPlayer's setup
  // callback above (the previous approach) fires before the player has
  // anything loaded and is silently dropped — resume always started from 0.
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay" && startSeconds > 0 && !hasSeeked.current) {
      hasSeeked.current = true;
      player.currentTime = startSeconds;
    }
  });

  const { killTranscode } = usePlaybackReporting({
    player,
    itemId,
    session: playbackSession,
    startTicks,
    audioStreamIndex: selectedAudioStreamIndex,
  });

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
      // Replace the source and seek back — wait for the new source to
      // actually be loaded first; setting currentTime immediately after
      // replaceAsync resolves is not guaranteed to take effect (see
      // waitForReady).
      await player.replaceAsync(urls.hlsUrl);
      await waitForReady(player);
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
