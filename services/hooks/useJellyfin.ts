/**
 * Jellyfin React Query Hooks
 * Bridges JellyfinClient to UI components with caching and refetching
 */

import {
    useInfiniteQuery,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { JellyfinPlaybackInfoResponse, JellyfinPlayMethod } from "../../types/jellyfin";
import { ServerConfig } from "../../types/server";
import { JellyfinClient } from "../api/jellyfin";
import { useServerStore } from "../stores/serverStore";

/** IDs negotiated with the server via PlaybackInfo; required before a stream URL can be built. */
export interface JellyfinPlaybackSession {
  playSessionId: string;
  mediaSourceId: string;
  playMethod: JellyfinPlayMethod;
  /** The audio track the server itself would pick, from the negotiated MediaSource. */
  defaultAudioStreamIndex?: number;
}

/** Create a JellyfinClient instance from a server config */
function createClient(server: ServerConfig): JellyfinClient {
  return new JellyfinClient(server);
}

/** Get first connected Jellyfin server */
function useJellyfinServer(): ServerConfig | undefined {
  return useServerStore((s) =>
    s.servers.find((srv) => srv.type === "jellyfin"),
  );
}

/**
 * Memoize the JellyfinClient per server so callers constructing one on every
 * render (or every query fetch) don't re-run the constructor's device-ID
 * backfill write (`resolveDeviceId` in jellyfin.ts) repeatedly.
 */
function useJellyfinClient(server: ServerConfig | undefined): JellyfinClient | undefined {
  return useMemo(
    () => (server ? createClient(server) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [server?.id, server?.deviceId, server?.url, server?.accessToken],
  );
}

// ─── Libraries ───────────────────────────────────────

export function useJellyfinLibraries() {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);

  return useQuery({
    queryKey: ["jellyfin", "libraries", server?.id],
    queryFn: async () => {
      if (!client) throw new Error("No Jellyfin server configured");
      const response = await client.getLibraries();
      return response.Items;
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// ─── Items (paginated) ──────────────────────────────

export function useJellyfinItems(params: {
  parentId?: string;
  includeItemTypes?: string;
  sortBy?: string;
  sortOrder?: string;
  searchTerm?: string;
  enabled?: boolean;
}) {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);
  const PAGE_SIZE = 20;

  return useInfiniteQuery({
    queryKey: ["jellyfin", "items", server?.id, params],
    queryFn: async ({ pageParam = 0 }) => {
      if (!client) throw new Error("No Jellyfin server configured");
      return client.getItems({
        ...params,
        limit: PAGE_SIZE,
        startIndex: pageParam,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextIndex = lastPage.StartIndex + lastPage.Items.length;
      return nextIndex < lastPage.TotalRecordCount ? nextIndex : undefined;
    },
    enabled: !!client && params.enabled !== false,
    staleTime: 60 * 1000,
  });
}

// ─── Item Detail ────────────────────────────────────

export function useJellyfinDetail(itemId: string | undefined) {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);

  return useQuery({
    queryKey: ["jellyfin", "detail", server?.id, itemId],
    queryFn: async () => {
      if (!client || !itemId) throw new Error("Missing server or item ID");
      return client.getItemDetail(itemId);
    },
    enabled: !!client && !!itemId,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Resume Items (Continue Watching) ───────────────

export function useResumeItems(limit: number = 12) {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);

  return useQuery({
    queryKey: ["jellyfin", "resume", server?.id, limit],
    queryFn: async () => {
      if (!client) throw new Error("No Jellyfin server configured");
      const response = await client.getResumeItems(limit);
      return response.Items;
    },
    enabled: !!client,
    staleTime: 30 * 1000, // 30s — changes often
    refetchInterval: 60 * 1000,
  });
}

// ─── Latest Items (Recently Added) ──────────────────

export function useLatestItems(parentId?: string, limit: number = 16) {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);

  return useQuery({
    queryKey: ["jellyfin", "latest", server?.id, parentId, limit],
    queryFn: async () => {
      if (!client) throw new Error("No Jellyfin server configured");
      return client.getLatestItems(parentId, limit);
    },
    enabled: !!client,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Search ─────────────────────────────────────────

export function useJellyfinSearch(term: string) {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);

  return useQuery({
    queryKey: ["jellyfin", "search", server?.id, term],
    queryFn: async () => {
      if (!client) throw new Error("No Jellyfin server configured");
      const response = await client.search(term);
      return response.Items;
    },
    enabled: !!client && term.length >= 2,
    staleTime: 30 * 1000,
  });
}

// ─── Image URL Helper ───────────────────────────────

export function useJellyfinImageUrl() {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);

  return useCallback(
    (
      itemId: string,
      imageType: "Primary" | "Backdrop" | "Thumb" = "Primary",
      maxWidth?: number,
      tag?: string,
    ): string | null => {
      if (!client) return null;
      return client.getImageUrl(itemId, imageType, maxWidth, undefined, tag);
    },
    [client],
  );
}

// ─── Playback Handshake ──────────────────────────────

/** Negotiate MediaSources + a server-issued PlaySessionId for an item before streaming it. */
export function useJellyfinPlaybackInfo() {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);

  return useCallback(
    (
      itemId: string,
      opts?: {
        maxStreamingBitrate?: number;
        startTimeTicks?: number;
        audioStreamIndex?: number;
        subtitleStreamIndex?: number;
      },
    ): Promise<JellyfinPlaybackInfoResponse> => {
      if (!client)
        return Promise.reject(new Error("No Jellyfin server configured"));
      return client.getPlaybackInfo(itemId, opts);
    },
    [client],
  );
}

// ─── Stream URL Helper ──────────────────────────────

/** Requires a negotiated playSessionId + mediaSourceId (see useJellyfinPlaybackInfo) — returns null until both are known. */
export function useJellyfinStreamUrl(
  playSessionId: string | undefined,
  mediaSourceId: string | undefined,
) {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);

  return useCallback(
    (
      itemId: string,
      maxBitrate?: number | null,
      audioStreamIndex?: number,
    ): { streamUrl: string; hlsUrl: string } | null => {
      if (!client || !playSessionId || !mediaSourceId) return null;
      return {
        streamUrl: client.getStreamUrl(itemId),
        hlsUrl: client.getHlsStreamUrl(
          itemId,
          playSessionId,
          mediaSourceId,
          maxBitrate,
          audioStreamIndex,
        ),
      };
    },
    [client, playSessionId, mediaSourceId],
  );
}

// ─── Seasons & Episodes (for TV series) ─────────────

export function useJellyfinSeasons(seriesId: string | undefined) {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);

  return useQuery({
    queryKey: ["jellyfin", "seasons", server?.id, seriesId],
    queryFn: async () => {
      if (!client || !seriesId) throw new Error("Missing params");
      const response = await client.getSeasons(seriesId);
      return response.Items;
    },
    enabled: !!client && !!seriesId,
    staleTime: 5 * 60 * 1000,
  });
}

/** All episodes for a series, or just those in one season if `seasonId` is given. */
export function useJellyfinEpisodes(
  seriesId: string | undefined,
  seasonId?: string,
) {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);

  return useQuery({
    queryKey: ["jellyfin", "episodes", server?.id, seriesId, seasonId],
    queryFn: async () => {
      if (!client || !seriesId) throw new Error("Missing params");
      const response = await client.getEpisodes(seriesId, seasonId);
      return response.Items;
    },
    enabled: !!client && !!seriesId,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Playback Reporting ─────────────────────────────

/**
 * Reports playback events for a session negotiated via useJellyfinPlaybackInfo.
 * All calls are no-ops until `session` is available — there's nothing to
 * correlate them to on the server without a real PlaySessionId.
 */
export function usePlaybackReporter(session?: JellyfinPlaybackSession) {
  const server = useJellyfinServer();
  const client = useJellyfinClient(server);
  const queryClient = useQueryClient();

  const reportStart = useCallback(
    async (
      itemId: string,
      positionTicks: number = 0,
      audioStreamIndex?: number,
      subtitleStreamIndex?: number,
    ) => {
      if (!client || !session) return;
      try {
        await client.reportPlaybackStart(
          itemId,
          positionTicks,
          session.playSessionId,
          {
            playMethod: session.playMethod,
            mediaSourceId: session.mediaSourceId,
            audioStreamIndex,
            subtitleStreamIndex,
          },
        );
      } catch (e) {
        console.warn("[Playback] Failed to report start", e);
      }
    },
    [client, session],
  );

  const reportProgress = useCallback(
    async (
      itemId: string,
      positionTicks: number,
      isPaused: boolean = false,
      audioStreamIndex?: number,
      subtitleStreamIndex?: number,
    ) => {
      if (!client || !session) return;
      try {
        await client.reportPlaybackProgress(
          itemId,
          positionTicks,
          isPaused,
          session.playSessionId,
          {
            playMethod: session.playMethod,
            mediaSourceId: session.mediaSourceId,
            audioStreamIndex,
            subtitleStreamIndex,
          },
        );
      } catch (e) {
        console.warn("[Playback] Failed to report progress", e);
      }
    },
    [client, session],
  );

  const killTranscode = useCallback(async () => {
    if (!client || !session) return;
    try {
      await client.deleteActiveEncoding(session.playSessionId);
    } catch (e) {
      console.warn("[Playback] Failed to kill transcode", e);
    }
  }, [client, session]);

  const reportStop = useCallback(
    async (itemId: string, positionTicks: number) => {
      if (!client || !session) return;
      try {
        await client.reportPlaybackStopped(
          itemId,
          positionTicks,
          session.playSessionId,
        );
        // Kill the server-side transcode session
        await client.deleteActiveEncoding(session.playSessionId);
        // Invalidate resume cache so Continue Watching refreshes
        queryClient.invalidateQueries({ queryKey: ["jellyfin", "resume"] });
        // Also invalidate the detail cache for this item
        queryClient.invalidateQueries({
          queryKey: ["jellyfin", "detail", server?.id, itemId],
        });
      } catch (e) {
        console.warn("[Playback] Failed to report stop", e);
      }
    },
    [client, server?.id, session, queryClient],
  );

  return {
    reportStart,
    reportProgress,
    reportStop,
    killTranscode,
  };
}
