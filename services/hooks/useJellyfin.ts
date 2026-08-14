/**
 * Jellyfin React Query Hooks
 * Bridges JellyfinClient to UI components with caching and refetching
 */

import {
    useInfiniteQuery,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { JellyfinPlaybackInfoResponse, JellyfinPlayMethod } from "../../types/jellyfin";
import { ServerConfig } from "../../types/server";
import { JellyfinClient } from "../api/jellyfin";
import { useServerStore } from "../stores/serverStore";

/** IDs negotiated with the server via PlaybackInfo; required before a stream URL can be built. */
export interface JellyfinPlaybackSession {
  playSessionId: string;
  mediaSourceId: string;
  playMethod: JellyfinPlayMethod;
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

// ─── Libraries ───────────────────────────────────────

export function useJellyfinLibraries() {
  const server = useJellyfinServer();

  return useQuery({
    queryKey: ["jellyfin", "libraries", server?.id],
    queryFn: async () => {
      if (!server) throw new Error("No Jellyfin server configured");
      const client = createClient(server);
      const response = await client.getLibraries();
      return response.Items;
    },
    enabled: !!server,
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
  const PAGE_SIZE = 20;

  return useInfiniteQuery({
    queryKey: ["jellyfin", "items", server?.id, params],
    queryFn: async ({ pageParam = 0 }) => {
      if (!server) throw new Error("No Jellyfin server configured");
      const client = createClient(server);
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
    enabled: !!server && params.enabled !== false,
    staleTime: 60 * 1000,
  });
}

// ─── Item Detail ────────────────────────────────────

export function useJellyfinDetail(itemId: string | undefined) {
  const server = useJellyfinServer();

  return useQuery({
    queryKey: ["jellyfin", "detail", server?.id, itemId],
    queryFn: async () => {
      if (!server || !itemId) throw new Error("Missing server or item ID");
      const client = createClient(server);
      return client.getItemDetail(itemId);
    },
    enabled: !!server && !!itemId,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Resume Items (Continue Watching) ───────────────

export function useResumeItems(limit: number = 12) {
  const server = useJellyfinServer();

  return useQuery({
    queryKey: ["jellyfin", "resume", server?.id, limit],
    queryFn: async () => {
      if (!server) throw new Error("No Jellyfin server configured");
      const client = createClient(server);
      const response = await client.getResumeItems(limit);
      return response.Items;
    },
    enabled: !!server,
    staleTime: 30 * 1000, // 30s — changes often
    refetchInterval: 60 * 1000,
  });
}

// ─── Latest Items (Recently Added) ──────────────────

export function useLatestItems(parentId?: string, limit: number = 16) {
  const server = useJellyfinServer();

  return useQuery({
    queryKey: ["jellyfin", "latest", server?.id, parentId, limit],
    queryFn: async () => {
      if (!server) throw new Error("No Jellyfin server configured");
      const client = createClient(server);
      return client.getLatestItems(parentId, limit);
    },
    enabled: !!server,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Search ─────────────────────────────────────────

export function useJellyfinSearch(term: string) {
  const server = useJellyfinServer();

  return useQuery({
    queryKey: ["jellyfin", "search", server?.id, term],
    queryFn: async () => {
      if (!server) throw new Error("No Jellyfin server configured");
      const client = createClient(server);
      const response = await client.search(term);
      return response.Items;
    },
    enabled: !!server && term.length >= 2,
    staleTime: 30 * 1000,
  });
}

// ─── Image URL Helper ───────────────────────────────

export function useJellyfinImageUrl() {
  const server = useJellyfinServer();

  return (
    itemId: string,
    imageType: "Primary" | "Backdrop" | "Thumb" = "Primary",
    maxWidth?: number,
  ): string | null => {
    if (!server) return null;
    const client = createClient(server);
    return client.getImageUrl(itemId, imageType, maxWidth);
  };
}

// ─── Playback Handshake ──────────────────────────────

/** Negotiate MediaSources + a server-issued PlaySessionId for an item before streaming it. */
export function useJellyfinPlaybackInfo() {
  const server = useJellyfinServer();

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
      if (!server)
        return Promise.reject(new Error("No Jellyfin server configured"));
      const client = createClient(server);
      return client.getPlaybackInfo(itemId, opts);
    },
    [server],
  );
}

// ─── Stream URL Helper ──────────────────────────────

/** Requires a negotiated playSessionId + mediaSourceId (see useJellyfinPlaybackInfo) — returns null until both are known. */
export function useJellyfinStreamUrl(
  playSessionId: string | undefined,
  mediaSourceId: string | undefined,
) {
  const server = useJellyfinServer();

  return (
    itemId: string,
    maxBitrate?: number | null,
    audioStreamIndex?: number,
  ): { streamUrl: string; hlsUrl: string } | null => {
    if (!server || !playSessionId || !mediaSourceId) return null;
    const client = createClient(server);
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
  };
}

// ─── Seasons & Episodes (for TV series) ─────────────

export function useJellyfinSeasons(seriesId: string | undefined) {
  const server = useJellyfinServer();

  return useQuery({
    queryKey: ["jellyfin", "seasons", server?.id, seriesId],
    queryFn: async () => {
      if (!server || !seriesId) throw new Error("Missing params");
      const client = createClient(server);
      const response = await client.getSeasons(seriesId);
      return response.Items;
    },
    enabled: !!server && !!seriesId,
    staleTime: 5 * 60 * 1000,
  });
}

/** All episodes for a series, or just those in one season if `seasonId` is given. */
export function useJellyfinEpisodes(
  seriesId: string | undefined,
  seasonId?: string,
) {
  const server = useJellyfinServer();

  return useQuery({
    queryKey: ["jellyfin", "episodes", server?.id, seriesId, seasonId],
    queryFn: async () => {
      if (!server || !seriesId) throw new Error("Missing params");
      const client = createClient(server);
      const response = await client.getEpisodes(seriesId, seasonId);
      return response.Items;
    },
    enabled: !!server && !!seriesId,
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
  const queryClient = useQueryClient();

  const reportStart = useCallback(
    async (
      itemId: string,
      positionTicks: number = 0,
      audioStreamIndex?: number,
      subtitleStreamIndex?: number,
    ) => {
      if (!server || !session) return;
      try {
        const client = createClient(server);
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
    [server, session],
  );

  const reportProgress = useCallback(
    async (
      itemId: string,
      positionTicks: number,
      isPaused: boolean = false,
      audioStreamIndex?: number,
      subtitleStreamIndex?: number,
    ) => {
      if (!server || !session) return;
      try {
        const client = createClient(server);
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
    [server, session],
  );

  const killTranscode = useCallback(async () => {
    if (!server || !session) return;
    try {
      const client = createClient(server);
      await client.deleteActiveEncoding(session.playSessionId);
    } catch (e) {
      console.warn("[Playback] Failed to kill transcode", e);
    }
  }, [server, session]);

  const reportStop = useCallback(
    async (itemId: string, positionTicks: number) => {
      if (!server || !session) return;
      try {
        const client = createClient(server);
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
          queryKey: ["jellyfin", "detail", server.id, itemId],
        });
      } catch (e) {
        console.warn("[Playback] Failed to report stop", e);
      }
    },
    [server, session, queryClient],
  );

  return {
    reportStart,
    reportProgress,
    reportStop,
    killTranscode,
  };
}
