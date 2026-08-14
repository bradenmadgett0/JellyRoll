/**
 * usePlaybackSession — Negotiates a PlaybackInfo handshake for an item and
 * exposes the resulting session (PlaySessionId, MediaSourceId, PlayMethod).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { JellyfinPlaybackErrorCode } from "../../types/jellyfin";
import { JellyfinPlaybackSession, useJellyfinPlaybackInfo } from "./useJellyfin";

const PLAYBACK_ERROR_MESSAGES: Record<JellyfinPlaybackErrorCode, string> = {
  NotAllowed: "You don't have permission to play this item.",
  NoCompatibleStream: "No compatible stream could be found for this item.",
  RateLimitExceeded: "Too many active streams. Try again in a moment.",
};

export interface UsePlaybackSessionOptions {
  startTicks?: number;
  maxStreamingBitrate?: number;
  audioStreamIndex?: number;
}

export interface UsePlaybackSessionResult {
  session: JellyfinPlaybackSession | null;
  error: string | null;
  isLoading: boolean;
  /** Re-runs the handshake against the current itemId/options. */
  renegotiate: () => void;
}

export function usePlaybackSession(
  itemId: string | undefined,
  { startTicks, maxStreamingBitrate, audioStreamIndex }: UsePlaybackSessionOptions = {},
): UsePlaybackSessionResult {
  const getPlaybackInfo = useJellyfinPlaybackInfo();
  const [session, setSession] = useState<JellyfinPlaybackSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped by renegotiate() to force the handshake effect to re-run even
  // when itemId/options haven't changed.
  const [nonce, setNonce] = useState(0);

  // Options are negotiated once per (itemId, nonce) cycle, not reactively on
  // every options change — a quality/audio switch updates these before the
  // next render, and switches are handled by replaceAsync (see player.tsx's
  // switchStream), not by re-negotiating here. If this effect depended on
  // them directly, every switch would fire a second, racing negotiation
  // alongside the manual replace. The ref always holds the latest values so
  // an explicit renegotiate() (P11) still negotiates with current settings.
  const optionsRef = useRef({ startTicks, maxStreamingBitrate, audioStreamIndex });
  useEffect(() => {
    optionsRef.current = { startTicks, maxStreamingBitrate, audioStreamIndex };
  });

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    setSession(null);
    setError(null);

    getPlaybackInfo(itemId, {
      startTimeTicks: optionsRef.current.startTicks,
      maxStreamingBitrate: optionsRef.current.maxStreamingBitrate,
      audioStreamIndex: optionsRef.current.audioStreamIndex,
    })
      .then((info) => {
        if (cancelled) return;
        if (info.ErrorCode) {
          setError(
            PLAYBACK_ERROR_MESSAGES[info.ErrorCode] ??
              "This item can't be played right now.",
          );
          return;
        }
        // Keep media-source selection as-is (first source) — revisited by
        // the P11 ticket, which needs to reason about re-selection on switch.
        const source = info.MediaSources?.[0];
        if (!source) {
          setError("No compatible media source was found.");
          return;
        }
        setSession({
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
        if (!cancelled) setError("Unable to start playback.");
      });

    return () => {
      cancelled = true;
    };
    // startTicks/maxStreamingBitrate/audioStreamIndex intentionally excluded
    // — see optionsRef comment above.
  }, [itemId, getPlaybackInfo, nonce]);

  const renegotiate = useCallback(() => setNonce((n) => n + 1), []);

  return {
    session,
    error,
    isLoading: !!itemId && !session && !error,
    renegotiate,
  };
}
