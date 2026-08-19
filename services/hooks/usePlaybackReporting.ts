/**
 * usePlaybackReporting — Position tracking + start/progress/stop reporting
 * for a negotiated playback session. Pure side effects, no JSX.
 *
 * player.currentTime is absolute (streams always start at position 0; the
 * caller seeks locally for a resume — see player.tsx) so position tracking
 * here is a direct read, no offset math.
 */

import { useEventListener } from "expo";
import { VideoPlayer } from "expo-video";
import { useEffect, useRef } from "react";
import { secondsToTicks } from "../../types/player";
import { JellyfinPlaybackSession, usePlaybackReporter } from "./useJellyfin";

const PROGRESS_REPORT_MS = 10_000; // report to Jellyfin every 10s

export interface UsePlaybackReportingOptions {
  player: VideoPlayer;
  itemId: string | undefined;
  session: JellyfinPlaybackSession | null | undefined;
  startTicks: number;
  audioStreamIndex?: number;
}

export function usePlaybackReporting({
  player,
  itemId,
  session,
  startTicks,
  audioStreamIndex,
}: UsePlaybackReportingOptions) {
  const { reportStart, reportProgress, reportStop, killTranscode } =
    usePlaybackReporter(session ?? undefined);

  // Initialize with startTicks so we never fall back to 0
  const lastKnownTicks = useRef(startTicks);
  const progressReporter = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Cache current position from the player's timeUpdate event ──
  // Requires player.timeUpdateEventInterval to be set (done once, at
  // creation, in player.tsx) — it defaults to 0, which means the event never
  // fires at all. Events don't fire on a released player, so no try/catch
  // is needed here the way the old setInterval poll required.
  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    const ticks = secondsToTicks(currentTime);
    if (ticks > 0) lastKnownTicks.current = ticks;
  });

  // ─── Report playback start ──────────────────────────────────
  // Fires for every new session, not just the first: (P11) a quality/audio
  // switch re-negotiates and gets a genuinely new PlaySessionId, and the
  // server 400s any /Sessions/Playing/Progress for a PlaySessionId that
  // never had a /Sessions/Playing sent for it — confirmed against a live
  // server. Reports lastKnownTicks (the actual current position) rather
  // than the original startTicks, since a restart mid-playback isn't
  // starting from the item's original resume point.
  useEffect(() => {
    if (!itemId || !session) return;
    reportStart(itemId, lastKnownTicks.current);
  }, [itemId, session, reportStart]);

  // ─── Report progress to Jellyfin (10s) ──────────────────────
  useEffect(() => {
    if (!itemId) return;

    progressReporter.current = setInterval(() => {
      reportProgress(
        itemId,
        lastKnownTicks.current,
        !player.playing,
        audioStreamIndex,
      );
    }, PROGRESS_REPORT_MS);

    return () => {
      if (progressReporter.current) {
        clearInterval(progressReporter.current);
        progressReporter.current = null;
      }
    };
  }, [itemId, player, reportProgress, audioStreamIndex]);

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

  return { killTranscode };
}
