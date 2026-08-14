/**
 * usePlaybackReporting — Position tracking + start/progress/stop reporting
 * for a negotiated playback session. Pure side effects, no JSX.
 */

import { VideoPlayer } from "expo-video";
import { useEffect, useRef } from "react";
import { secondsToTicks } from "../../types/player";
import { JellyfinPlaybackSession, usePlaybackReporter } from "./useJellyfin";

const POSITION_TRACK_MS = 1_000; // cache position every 1s
const PROGRESS_REPORT_MS = 10_000; // report to Jellyfin every 10s

export interface UsePlaybackReportingOptions {
  player: VideoPlayer | undefined;
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
  const positionTracker = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressReporter = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (!itemId || !session) return;
    reportStart(itemId, startTicks);
  }, [itemId, session, startTicks, reportStart]);

  // ─── Report progress to Jellyfin (10s) ──────────────────────
  useEffect(() => {
    if (!itemId || !player) return;

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
