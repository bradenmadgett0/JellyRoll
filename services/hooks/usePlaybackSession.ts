/**
 * usePlaybackSession — Negotiates a PlaybackInfo handshake for an item and
 * exposes the resulting session (PlaySessionId, MediaSourceId, PlayMethod).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { buildDeviceProfile } from "../api/deviceProfile";
import { JellyfinPlaybackErrorCode } from "../../types/jellyfin";
import {
  JellyfinPlaybackSession,
  useJellyfinPlaybackInfo,
  useJellyfinResolveStreamUrl,
} from "./useJellyfin";

// Built once per module load, not per negotiation — it's static data, no
// need to reconstruct it on every handshake.
const DEVICE_PROFILE = buildDeviceProfile();

const PLAYBACK_ERROR_MESSAGES: Record<JellyfinPlaybackErrorCode, string> = {
  NotAllowed: "You don't have permission to play this item.",
  NoCompatibleStream: "No compatible stream could be found for this item.",
  RateLimitExceeded: "Too many active streams. Try again in a moment.",
};

export interface UsePlaybackSessionOptions {
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
  { maxStreamingBitrate, audioStreamIndex }: UsePlaybackSessionOptions = {},
): UsePlaybackSessionResult {
  const getPlaybackInfo = useJellyfinPlaybackInfo();
  const resolveStreamUrl = useJellyfinResolveStreamUrl();
  const [session, setSession] = useState<JellyfinPlaybackSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Options are read once per negotiation, not reactively — see negotiate()
  // below. The ref always holds the latest render's values so an explicit
  // renegotiate() call (without overriding a given field) still uses
  // whatever's current, without the initial-negotiation effect depending on
  // (and re-firing for) every options change.
  const optionsRef = useRef({ maxStreamingBitrate, audioStreamIndex });
  useEffect(() => {
    optionsRef.current = { maxStreamingBitrate, audioStreamIndex };
  });

  // Guards against a negotiation resolving after a newer one has already
  // superseded it — an itemId change, or (P11) rapid quality/audio
  // switching. Only the response matching the latest request is allowed to
  // update state; a stale one is silently dropped. This subsumes the
  // simpler "cancelled" boolean pattern P7 used, which only protected
  // against the itemId-change case within a single effect instance.
  const requestIdRef = useRef(0);

  // Mirrors `session` for reads inside negotiate(), which can't depend on
  // session state without re-creating itself — and with it the
  // initial-negotiation effect below — on every handshake.
  const sessionRef = useRef<JellyfinPlaybackSession | null>(null);

  const negotiate = useCallback(
    async (
      id: string,
      overrides?: Partial<UsePlaybackSessionOptions>,
    ): Promise<JellyfinPlaybackSession | null> => {
      const requestId = ++requestIdRef.current;
      const opts = { ...optionsRef.current, ...overrides };

      // Jellyfin applies AudioStreamIndex only to the media source named by
      // MediaSourceId; with nothing to match against it silently drops the
      // request's audio selection and bakes the source's DEFAULT audio track
      // into the TranscodingUrl it returns. Nothing about that looks like a
      // failure — the handshake succeeds and the URL plays — the audio just
      // comes back in the original language. So pin the source we already
      // know we're playing whenever we have it.
      const mediaSourceId = sessionRef.current?.mediaSourceId;


      // No StartTimeTicks: it can't set the stream's start position (the
      // playlist always spans the full item) and breaks the load when the
      // server does honour it. See getPlaybackInfo's note on the param.
      try {
        let info = await getPlaybackInfo(id, {
          maxStreamingBitrate: opts.maxStreamingBitrate,
          audioStreamIndex: opts.audioStreamIndex,
          mediaSourceId,
          deviceProfile: DEVICE_PROFILE,
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
        let source = info.MediaSources?.[0];
        if (!source) {
          setError("No compatible media source was found.");
          return null;
        }

        // First handshake for this item: there was no session yet, so there
        // was no source id to pin a requested track to. Now the response
        // names one — ask again with it, so a restored audio preference
        // actually applies instead of silently losing to the default. Done
        // before any state is published, so the un-pinned session never
        // reaches the player and can't race the one-shot hlsUrl effect in
        // player.tsx. Costs one extra round trip and no transcode (ffmpeg
        // starts only when the stream URL is fetched), and only when a track
        // was actually asked for.
        if (!mediaSourceId && opts.audioStreamIndex !== undefined) {
          const pinned = await getPlaybackInfo(id, {
            maxStreamingBitrate: opts.maxStreamingBitrate,
            audioStreamIndex: opts.audioStreamIndex,
            mediaSourceId: source.Id,
            deviceProfile: DEVICE_PROFILE,
          });
          if (requestId !== requestIdRef.current) return null;
          // Keep the un-pinned result if the retry didn't yield a usable
          // one — a playable stream in the wrong language beats none.
          const pinnedSource = pinned.ErrorCode
            ? undefined
            : pinned.MediaSources?.[0];
          if (pinnedSource) {
            info = pinned;
            source = pinnedSource;
          }
        }
        // Resolves DirectPlay/DirectStream/Transcode from what the server
        // actually negotiated (P14), rather than assuming every request goes
        // through /master.m3u8 — now that a real DeviceProfile is sent, an
        // already-compatible source direct-plays instead of forcing a
        // transcode.
        const resolved = resolveStreamUrl(
          id,
          source,
          info.PlaySessionId,
          opts.maxStreamingBitrate,
          opts.audioStreamIndex,
        );
        if (!resolved) {
          setError("Unable to build a playable stream URL.");
          return null;
        }
        const newSession: JellyfinPlaybackSession = {
          playSessionId: info.PlaySessionId,
          mediaSourceId: source.Id,
          playMethod: resolved.playMethod,
          streamUrl: resolved.url,
          defaultAudioStreamIndex: source.DefaultAudioStreamIndex,
        };
        setError(null);
        sessionRef.current = newSession;
        setSession(newSession);
        return newSession;
      } catch {
        if (requestId !== requestIdRef.current) return null;
        setError("Unable to start playback.");
        return null;
      }
    },
    [getPlaybackInfo, resolveStreamUrl],
  );

  useEffect(() => {
    if (!itemId) return;
    sessionRef.current = null;
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
