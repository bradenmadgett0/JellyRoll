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
import type { ThemeTokens } from "@/constants/theme";
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
import { useJellyfinDetail } from "../../services/hooks/useJellyfin";
import { useAudioTrackMap } from "../../services/hooks/useAudioTrackMap";
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

/**
 * Resume-seek watchdog: how long a just-issued resume seek may sit in
 * 'loading' before it's re-issued, and how many attempts before giving up
 * and surfacing the stream-error overlay (whose Retry renegotiates a fresh
 * session through switchStream — the known-good recovery path).
 */
const RESUME_STALL_MS = 8000;
const MAX_RESUME_ATTEMPTS = 3;

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
  // Guards the resume seek's trigger to once per mount; retries are driven
  // by the watchdog inside attemptResumeSeek, not by re-triggering.
  const hasSeeked = useRef(false);
  // Identifies the newest in-flight switchStream — quality/audio changes and
  // error retries can overlap, and only the newest may touch the player.
  const switchIdRef = useRef(0);

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
    maxStreamingBitrate: selectedQuality.maxBitrate ?? undefined,
    audioStreamIndex: selectedAudioStreamIndex,
  });

  // Single source of truth for the preset list — both the parent (URL
  // building) and the overlay (picker UI) read from this. Reactive, unlike
  // the one-time resolution above, so it picks up the dynamic "Max" entry
  // once the item detail loads.
  const qualityPresets = useMemo(
    () => buildQualityPresets(item?.MediaSources?.[0]?.Bitrate),
    [item],
  );

  // The item's audio tracks, as Jellyfin describes them. Shared by the
  // default-track effect below and useAudioTrackMap, which maps these onto
  // the player's own track list for local switching.
  const audioStreams = useMemo(
    () =>
      item?.MediaSources?.[0]?.MediaStreams?.filter((s) => s.Type === "Audio") ??
      [],
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
    const fallback =
      audioStreams.find((s) => s.IsDefault)?.Index ?? audioStreams[0]?.Index;
    if (fallback !== undefined) setSelectedAudioStreamIndex(fallback);
  }, [playbackSession, selectedAudioStreamIndex, audioStreams]);

  // NOTE: a server-side start offset — having the transcode itself begin at
  // the resume point, so the client needn't seek into un-transcoded content
  // — does not work here, confirmed twice against the live server. Jellyfin's
  // HLS playlist always spans the FULL item (an offset stream still reported
  // the complete runtime), so StartTimeTicks moves only where the encoder
  // starts, never where the timeline starts. The player still opens at
  // playlist position 0 and requests segment 0, which an encoder started
  // partway in never produces: the load fails with "resource unavailable".
  // Positioning is therefore entirely the client's job — player.currentTime
  // is absolute, and the seek below is the only place it is set. Jellyfin
  // restarts its own transcode when a distant segment is requested, which is
  // what makes a plain seek viable at all.
  //
  // Computed once and frozen forever after: expo-video's useVideoPlayer
  // recreates the entire native player whenever this source string changes
  // (it memoizes on JSON.stringify(source)), so this must NOT reactively
  // track playbackSession after the first time — (P11) every quality/audio
  // switch renegotiates a fresh session, which would otherwise tear down
  // and recreate the whole player on every switch instead of the intended
  // in-place replaceAsync in switchStream. playbackSession.streamUrl is
  // already fully resolved (P14) — DirectPlay/DirectStream/Transcode, with
  // bitrate and audio track baked in server-side — so no extra URL-building
  // step is needed here.
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  useEffect(() => {
    if (hlsUrl || !playbackSession) return;
    setHlsUrl(playbackSession.streamUrl);
  }, [playbackSession, hlsUrl]);

  const player = useVideoPlayer(hlsUrl ?? "", (p) => {
    p.loop = false;
    p.allowsExternalPlayback = true;
    // Defaults to 0, which means timeUpdate never fires at all. 0.5s matches
    // the scrubber's old poll cadence; usePlaybackReporting also listens to
    // this same event for position caching.
    p.timeUpdateEventInterval = 0.5;
    // With a resume position, playback deliberately does NOT start here —
    // the resume block below seeks from the never-played readyToPlay state
    // and only then calls play(), mirroring switchStream's replace →
    // waitForReady → seek → play order. See that block for the evidence.
    if (startSeconds <= 0) p.play();
  });

  const { killTranscode, lastKnownTicksRef } = usePlaybackReporting({
    player,
    itemId,
    session: playbackSession,
    startTicks,
    audioStreamIndex: selectedAudioStreamIndex,
  });

  // Resolves a Jellyfin audio stream index to a track the player already has
  // open, for the DirectPlay fast path in handleAudioStreamChange below.
  const { switchAudioTrack } = useAudioTrackMap({
    player,
    audioStreams,
    playMethod: playbackSession?.playMethod,
  });

  // ─── Mid-playback stream health ──────────────────────────────
  // Once past the initial handshake, a dead transcode or a 404'd playlist
  // otherwise shows nothing — a frozen frame with no message and no way to
  // recover but backing out. Gated on hlsUrl: before it's set, the player
  // was created with an empty-string placeholder source, whose own status
  // churn isn't a real playback error.
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  useEventListener(player, "statusChange", ({ status, error }) => {
    if (!hlsUrl) return;
    setIsBuffering(status === "loading");
    setStreamError(
      status === "error" ? (error?.message ?? "Playback failed.") : null,
    );
  });

  // ─── Resume-position seek ────────────────────────────────────
  // Order matters: wait for readyToPlay, seek while the player has never
  // been told to play, then play() — the same sequence switchStream uses
  // after replaceAsync, and the one far-seek-into-a-fresh-transcode shape
  // observed succeeding against the live server (quality switch to a
  // brand-new PlaySessionId, immediate seek to the resume point).
  //
  // Every failed variant of this seek — in the setup callback, at first
  // readyToPlay, at first timeUpdate — was issued on a player that had
  // already been told to play (autoplay lived in the setup callback). Each
  // accepted the position (currentTime read it back) and then sat in
  // 'loading' forever. The shapes that work — manual scrubs on an
  // established pipeline, switchStream's pre-play seek on a fresh session —
  // differ from the failures only in that the pipeline wasn't
  // simultaneously just-started AND playing. The fresh-session success also
  // rules out the server refusing to restart a young transcode job; the
  // wedge is client-side. So: no autoplay when a resume position exists,
  // and the first play() happens after the seek.
  //
  // The watchdog is the safety net in case that reading is still wrong: a
  // wedged seek (still 'loading', still parked at the target) is re-issued
  // — a later seek reliably un-wedges a stuck one, observed repeatedly with
  // manual scrubs — and after MAX_RESUME_ATTEMPTS it surfaces the
  // stream-error overlay, whose Retry renegotiates via switchStream.
  const resumeAttempts = useRef(0);
  const resumeWatchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attemptResumeSeek = useCallback(
    function attempt() {
      resumeAttempts.current += 1;
      player.pause();
      player.currentTime = startSeconds;
      player.play();
      resumeWatchdog.current = setTimeout(() => {
        // Wedged = still buffering AND still parked at the target. A player
        // that recovered, or that the user scrubbed somewhere else in the
        // meantime, fails this check and the watchdog stands down.
        const wedged =
          player.status === "loading" &&
          Math.abs(player.currentTime - startSeconds) < 1;
        if (!wedged) return;
        if (resumeAttempts.current >= MAX_RESUME_ATTEMPTS) {
          setStreamError("Playback stalled while resuming.");
          return;
        }
        attempt();
      }, RESUME_STALL_MS);
    },
    [player, startSeconds],
  );

  useEventListener(player, "statusChange", ({ status }) => {
    if (
      status !== "readyToPlay" ||
      startSeconds <= 0 ||
      hasSeeked.current ||
      !hlsUrl
    ) {
      return;
    }
    hasSeeked.current = true;
    attemptResumeSeek();
  });

  // Listeners bind in an effect, a tick after the player object exists. If
  // the source reached readyToPlay inside that gap the listener above never
  // fires — and with autoplay skipped for resumes, nothing would ever play.
  // Before, a missed event just meant playing from 0; now it must be caught.
  useEffect(() => {
    if (
      hlsUrl &&
      startSeconds > 0 &&
      !hasSeeked.current &&
      player.status === "readyToPlay"
    ) {
      hasSeeked.current = true;
      attemptResumeSeek();
    }
  }, [player, hlsUrl, startSeconds, attemptResumeSeek]);

  useEffect(
    () => () => {
      if (resumeWatchdog.current) clearTimeout(resumeWatchdog.current);
    },
    [],
  );

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
      resumeTicks: resumeTicksOverride,
    }: {
      bitrate: number | null;
      audioStreamIndex: number | undefined;
      /**
       * Overrides the resume position instead of reading player.currentTime.
       * Used by the stream-error retry path (P13): a player that just
       * errored may report a stale or unreadable currentTime, so retry
       * resumes from the last known-good tracked position instead.
       */
      resumeTicks?: number;
    }) => {
      if (!itemId || !player) return;

      // Stop the outgoing stream before anything else. The PlaybackInfo
      // round-trip below runs while the player is otherwise still playing
      // the OLD source, since nothing touches it until replaceAsync at the
      // end. Left running, an audio switch keeps playing the language the
      // user just replaced for that whole window, and the position captured
      // below keeps advancing, so the seek at the end jumps backwards by
      // however long the switch took.
      const switchId = ++switchIdRef.current;
      const wasPlaying = player.playing;
      player.pause();
      // Pausing doesn't change player.status, so the statusChange listener
      // above won't raise the spinner on its own until replaceAsync — and a
      // frozen, silent frame with no feedback reads as a crash.
      setIsBuffering(true);

      const resumeTicks =
        resumeTicksOverride ?? secondsToTicks(player.currentTime);
      const resumeSeconds = ticksToSeconds(resumeTicks);
      const newSession = await renegotiate({
        maxStreamingBitrate: bitrate ?? undefined,
        audioStreamIndex,
      });
      // Renegotiation failed. The old source is still loaded and its
      // transcode still alive (nothing has been torn down yet), so restore
      // the player as we found it rather than stranding it paused behind a
      // spinner with no route out. The reason surfaces via playbackError.
      // Null means either a genuine failure or that a newer switch has
      // superseded this one (renegotiate drops stale responses). Only the
      // newest may touch the player — otherwise an abandoned switch resumes
      // the outgoing stream underneath the one still negotiating.
      if (!newSession) {
        if (switchId === switchIdRef.current) {
          setIsBuffering(false);
          if (wasPlaying) player.play();
        }
        return;
      }
      // Tear the outgoing transcode down before the player starts the new
      // one below, so the two never run at once competing for the same
      // server CPU. Safe here because the player is already paused and no
      // longer pulling segments from the old source, and killTranscode
      // swallows its own errors so it can't break the chain. Which session
      // it targets is unchanged — see the note above.
      await killTranscode();
      // newSession.streamUrl is already resolved (P14) — built from the
      // session we just negotiated, not from playbackSession, which hasn't
      // propagated back through a render yet at this point in the async flow.
      // Replace the source and seek back — wait for the new source to
      // actually be loaded first; setting currentTime immediately after
      // replaceAsync resolves is not guaranteed to take effect (see
      // waitForReady).
      await player.replaceAsync(newSession.streamUrl);
      await waitForReady(player);
      player.currentTime = resumeSeconds;
      player.play();
    },
    [itemId, player, renegotiate, killTranscode],
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
  // A DirectPlay source is the original file, so every audio track is
  // already inside the container the player has open — switching is an
  // in-place media-selection change with no new URL, no transcode teardown,
  // no reload and no rebuffer. switchAudioTrack reports false when the track
  // couldn't be mapped unambiguously or the player didn't honour the
  // selection (see useAudioTrackMap), and false is also what a transcoded
  // session always returns, since Jellyfin bakes a single audio track into
  // the transcode job. Every one of those cases falls through to the full
  // renegotiation below — i.e. exactly the previous behaviour.
  //
  // State/persistence/reporting are updated up front either way: the
  // Jellyfin stream index stays the app's currency, and the player track is
  // only ever a resolution target at the moment of switching.
  const handleAudioStreamChange = useCallback(
    async (audioStreamIndex: number) => {
      if (audioStreamIndex === selectedAudioStreamIndex) return;
      setSelectedAudioStreamIndex(audioStreamIndex);
      setMediaSettings({ audioStreamIndex });
      if (await switchAudioTrack(audioStreamIndex)) return;
      switchStream({ bitrate: selectedQuality.maxBitrate, audioStreamIndex });
    },
    [
      selectedAudioStreamIndex,
      selectedQuality,
      setMediaSettings,
      switchAudioTrack,
      switchStream,
    ],
  );

  // ─── Retry after a mid-playback stream error ─────────────────
  // A fresh handshake is the right recovery — the most likely cause is a
  // server-side transcode that was reaped — resuming at the same
  // bitrate/audio track from the last known-good position, not from 0.
  const handleRetry = useCallback(() => {
    setStreamError(null);
    setIsBuffering(true);
    switchStream({
      bitrate: selectedQuality.maxBitrate,
      audioStreamIndex: selectedAudioStreamIndex,
      resumeTicks: lastKnownTicksRef.current,
    });
  }, [switchStream, selectedQuality, selectedAudioStreamIndex, lastKnownTicksRef]);

  // Memoize VideoPlayer to prevent re-renders from overlay toggle
  const videoView = useMemo(
    () => <VideoPlayer player={player} toggleOverlay={toggleOverlay} />,
    [player, toggleOverlay],
  );

  // ─── Error state (before any stream ever loaded) ─────────────
  // playbackError && !hlsUrl, not just playbackError: once a stream is
  // playing, a later playbackError can only come from a failed switchStream
  // renegotiation (P11) — switchStream already bails out on its own and
  // leaves the old stream running in that case, so don't tear down an
  // already-working player screen over it. A mid-playback failure instead
  // surfaces as streamError (below, P13) — an overlay on the still-mounted
  // player, with a Retry.
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
      {streamError ? (
        <View style={styles.streamErrorOverlay}>
          <Ionicons
            name="alert-circle"
            size={48}
            color={styles.iconError.color}
          />
          <Text style={styles.errorText}>{streamError}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={handleRetry}>
            <Text style={styles.backBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        isBuffering && (
          <View style={styles.bufferingOverlay} pointerEvents="none">
            <ActivityIndicator
              size="large"
              color={styles.iconPrimary.color}
            />
          </View>
        )
      )}
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

const createStyles = (colors: AppColors, theme: ThemeTokens) =>
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
    // Overlays the frozen frame instead of replacing the whole screen — the
    // user keeps context (and PlayerOverlay stays reachable) rather than
    // being dropped onto a blank error page for a mid-playback failure.
    streamErrorOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.85)",
      justifyContent: "center",
      alignItems: "center",
      gap: Spacing.md,
      zIndex: 30,
    },
    bufferingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 30,
    },
    errorText: {
      ...theme.text("title", "medium"),
      color: colors.error,
    },
    backBtn: {
      backgroundColor: colors.backgroundTertiary,
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.md,
      borderRadius: Spacing.radiusMd,
      marginTop: Spacing.md,
    },
    backBtnText: {
      ...theme.text("body", "semibold"),
      color: colors.primary,
    },
    iconError: { color: colors.error },
    iconPrimary: { color: colors.primary },
  });
