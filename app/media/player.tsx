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
    renegotiate,
  } = usePlaybackSession(itemId, {
    startTicks,
    maxStreamingBitrate: selectedQuality.maxBitrate ?? undefined,
    audioStreamIndex: selectedAudioStreamIndex,
  });
  // Takes playSessionId/mediaSourceId per call (not bound here) — switchStream
  // needs to build a URL from a session it just renegotiated, before that
  // session has propagated back through a render as playbackSession.
  const getStreamUrl = useJellyfinStreamUrl();

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
  // Computed once and frozen forever after: expo-video's useVideoPlayer
  // recreates the entire native player whenever this source string changes
  // (it memoizes on JSON.stringify(source)), so this must NOT reactively
  // track playbackSession after the first time — (P11) every quality/audio
  // switch renegotiates a fresh session, which would otherwise tear down
  // and recreate the whole player on every switch instead of the intended
  // in-place replaceAsync in switchStream.
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  useEffect(() => {
    if (hlsUrl || !itemId || !playbackSession) return;
    const urls = getStreamUrl(
      itemId,
      playbackSession.playSessionId,
      playbackSession.mediaSourceId,
      selectedQuality.maxBitrate,
      selectedAudioStreamIndex,
    );
    if (urls?.hlsUrl) setHlsUrl(urls.hlsUrl);
    // selectedQuality/selectedAudioStreamIndex intentionally excluded — read
    // once here, at the moment the session first becomes available (already
    // resolved from saved settings before that, per above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, playbackSession, hlsUrl, getStreamUrl]);

  const player = useVideoPlayer(hlsUrl ?? "", (p) => {
    p.loop = false;
    p.allowsExternalPlayback = true;
    // Defaults to 0, which means timeUpdate never fires at all. 0.5s matches
    // the scrubber's old poll cadence; usePlaybackReporting also listens to
    // this same event for position caching.
    p.timeUpdateEventInterval = 0.5;
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
  // Re-negotiates a fresh PlaybackInfo session for every switch, rather than
  // reusing the current one: reusing the same PlaySessionId across a
  // kill-then-reuse is ambiguous about which request the server should
  // honor, and — since T5 always requests /master.m3u8 (HLS), never raw
  // /stream — the session's playMethod (DirectStream vs Transcode) can
  // genuinely change with a different bitrate/audio constraint, so
  // usePlaybackReporter needs the new session to report it truthfully.
  // killTranscode here still targets the OLD session — it's captured from
  // this render's closure, before renegotiate() updates playbackSession —
  // so tearing down the old transcode is unaffected by the new negotiation.
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
      const newSession = await renegotiate({
        startTicks: secondsToTicks(resumeTime),
        maxStreamingBitrate: bitrate ?? undefined,
        audioStreamIndex,
      });
      if (!newSession) return;
      // Build the new URL from the session we just negotiated, not from
      // playbackSession — that state hasn't propagated back through a
      // render yet at this point in the async flow.
      const urls = getStreamUrl(
        itemId,
        newSession.playSessionId,
        newSession.mediaSourceId,
        bitrate,
        audioStreamIndex,
      );
      if (!urls?.hlsUrl) return;
      // Kill the old transcode before starting the new one.
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
    [itemId, player, renegotiate, getStreamUrl, killTranscode],
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
  // playbackError && !hlsUrl, not just playbackError: once a stream is
  // playing, a later playbackError can only come from a failed switchStream
  // renegotiation (P11) — switchStream already bails out on its own and
  // leaves the old stream running in that case, so don't tear down an
  // already-working player screen over it. Full-screen error is only for a
  // failure before any stream ever loaded. P13 will build a proper inline
  // error/retry affordance for the post-load case.
  if (!itemId || (playbackError && !hlsUrl)) {
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
