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
  /**
   * Re-runs the handshake, optionally overriding individual options (e.g. a
   * quality/audio switch), and resolves with the new session — or `null` on
   * failure, or if a newer call/itemId change has already superseded this
   * one by the time the response arrives.
   */
  renegotiate: (
    overrides?: Partial<UsePlaybackSessionOptions>,
  ) => Promise<JellyfinPlaybackSession | null>;
}

export function usePlaybackSession(
  itemId: string | undefined,
  { startTicks, maxStreamingBitrate, audioStreamIndex }: UsePlaybackSessionOptions = {},
): UsePlaybackSessionResult {
  const getPlaybackInfo = useJellyfinPlaybackInfo();
  const [session, setSession] = useState<JellyfinPlaybackSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Options are read once per negotiation, not reactively — see negotiate()
  // below. The ref always holds the latest render's values so an explicit
  // renegotiate() call (without overriding a given field) still uses
  // whatever's current, without the initial-negotiation effect depending on
  // (and re-firing for) every options change.
  const optionsRef = useRef({ startTicks, maxStreamingBitrate, audioStreamIndex });
  useEffect(() => {
    optionsRef.current = { startTicks, maxStreamingBitrate, audioStreamIndex };
  });

  // Guards against a negotiation resolving after a newer one has already
  // superseded it — an itemId change, or (P11) rapid quality/audio
  // switching. Only the response matching the latest request is allowed to
  // update state; a stale one is silently dropped. This subsumes the
  // simpler "cancelled" boolean pattern P7 used, which only protected
  // against the itemId-change case within a single effect instance.
  const requestIdRef = useRef(0);

  const negotiate = useCallback(
    async (
      id: string,
      overrides?: Partial<UsePlaybackSessionOptions>,
    ): Promise<JellyfinPlaybackSession | null> => {
      const requestId = ++requestIdRef.current;
      const opts = { ...optionsRef.current, ...overrides };

      try {
        const info = await getPlaybackInfo(id, {
          startTimeTicks: opts.startTicks,
          maxStreamingBitrate: opts.maxStreamingBitrate,
          audioStreamIndex: opts.audioStreamIndex,
        });
        if (requestId !== requestIdRef.current) return null;

        if (info.ErrorCode) {
          setError(
            PLAYBACK_ERROR_MESSAGES[info.ErrorCode] ??
              "This item can't be played right now.",
          );
          return null;
        }
        // Keep media-source selection as-is (first source) — a multi-version
        // item would need its own selection UI, which doesn't exist yet.
        const source = info.MediaSources?.[0];
        if (!source) {
          setError("No compatible media source was found.");
          return null;
        }
        const newSession: JellyfinPlaybackSession = {
          playSessionId: info.PlaySessionId,
          mediaSourceId: source.Id,
          // We only ever request /master.m3u8 (HLS), never the raw /stream
          // endpoint, so true DirectPlay never happens through this path.
          playMethod: source.SupportsDirectStream
            ? "DirectStream"
            : "Transcode",
          defaultAudioStreamIndex: source.DefaultAudioStreamIndex,
        };
        setError(null);
        setSession(newSession);
        return newSession;
      } catch {
        if (requestId !== requestIdRef.current) return null;
        setError("Unable to start playback.");
        return null;
      }
    },
    [getPlaybackInfo],
  );

  useEffect(() => {
    if (!itemId) return;
    setSession(null);
    setError(null);
    negotiate(itemId);
  }, [itemId, negotiate]);

  const renegotiate = useCallback(
    (overrides?: Partial<UsePlaybackSessionOptions>) => {
      if (!itemId) return Promise.resolve(null);
      return negotiate(itemId, overrides);
    },
    [itemId, negotiate],
  );

  return {
    session,
    error,
    isLoading: !!itemId && !session && !error,
    renegotiate,
  };
}
