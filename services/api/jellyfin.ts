/**
 * Jellyfin API Client
 * Handles authentication, library browsing, and media streaming
 */

import axios, { AxiosInstance } from "axios";
import {
    JellyfinAuthResponse,
    JellyfinItem,
    JellyfinItemsResponse,
    JellyfinLibraryResponse,
    JellyfinPlaybackInfoResponse,
    JellyfinPlayMethod,
    JellyfinSystemInfo,
} from "../../types/jellyfin";
import { ConnectionTestResult, ServerConfig } from "../../types/server";
import { useServerStore } from "../stores/serverStore";

const CLIENT_NAME = "JellyRoll";
const CLIENT_VERSION = "1.0.0";
const DEVICE_NAME = "JellyRoll Mobile";

export function generateDeviceId(): string {
  return "jellyroll_" + Math.random().toString(36).substring(2, 15);
}

/**
 * Resolve the stable device ID for a server, backfilling and persisting one
 * for installs that predate the deviceId field. Without a stable ID, Jellyfin
 * registers a new session/device per request.
 */
function resolveDeviceId(server: ServerConfig): string {
  if (server.deviceId) return server.deviceId;
  const deviceId = generateDeviceId();
  useServerStore
    .getState()
    .updateServer(server.id, { deviceId })
    .catch((e) => console.warn("[Jellyfin] Failed to persist device ID", e));
  return deviceId;
}

export class JellyfinClient {
  private client: AxiosInstance;
  private server: ServerConfig;
  private deviceId: string;

  getDeviceId(): string {
    return this.deviceId;
  }

  constructor(server: ServerConfig) {
    this.server = server;
    this.deviceId = resolveDeviceId(server);

    this.client = axios.create({
      baseURL: server.url,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth header to all requests
    this.client.interceptors.request.use((config) => {
      const params = [
        `Client="${CLIENT_NAME}"`,
        `Device="${DEVICE_NAME}"`,
        `DeviceId="${this.deviceId}"`,
        `Version="${CLIENT_VERSION}"`,
      ];
      if (this.server.accessToken) {
        params.push(`Token="${this.server.accessToken}"`);
      }
      config.headers["Authorization"] = `MediaBrowser ${params.join(", ")}`;
      return config;
    });

    // Error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new Error(
            "Authentication failed. Please re-enter your credentials.",
          );
        }
        if (error.response) {
          throw new Error(
            `Jellyfin error ${error.response.status}: ${error.response.statusText}`,
          );
        }
        if (error.request) {
          throw new Error(
            "No response from Jellyfin server. Check your connection.",
          );
        }
        throw error;
      },
    );
  }

  // ─── Authentication ──────────────────────────────────

  async authenticateByName(
    username: string,
    password: string,
  ): Promise<JellyfinAuthResponse> {
    const { data } = await this.client.post("/Users/AuthenticateByName", {
      Username: username,
      Pw: password,
    });
    return data;
  }

  /** Test connection (unauthenticated — just checks server is reachable) */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const info = await this.getSystemInfo();
      return {
        success: true,
        serverName: info.ServerName,
        serverVersion: info.Version,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ─── System ──────────────────────────────────────────

  async getSystemInfo(): Promise<JellyfinSystemInfo> {
    const { data } = await this.client.get("/System/Info/Public");
    return data;
  }

  // ─── Libraries ───────────────────────────────────────

  async getLibraries(): Promise<JellyfinLibraryResponse> {
    const userId = this.server.userId;
    if (!userId) throw new Error("Not authenticated. User ID is missing.");
    const { data } = await this.client.get("/UserViews", {
      params: { userId },
    });
    return data;
  }

  // ─── Items ───────────────────────────────────────────

  async getItems(params: {
    parentId?: string;
    includeItemTypes?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    startIndex?: number;
    fields?: string;
    searchTerm?: string;
    filters?: string;
    genres?: string;
    years?: string;
  }): Promise<JellyfinItemsResponse> {
    const userId = this.server.userId;
    if (!userId) throw new Error("Not authenticated. User ID is missing.");

    const { data } = await this.client.get("/Items", {
      params: {
        userId,
        ParentId: params.parentId,
        IncludeItemTypes: params.includeItemTypes,
        SortBy: params.sortBy ?? "SortName",
        SortOrder: params.sortOrder ?? "Ascending",
        Limit: params.limit,
        StartIndex: params.startIndex ?? 0,
        Fields:
          params.fields ??
          "Overview,PrimaryImageAspectRatio,MediaSources,Genres",
        SearchTerm: params.searchTerm,
        Filters: params.filters,
        Genres: params.genres,
        Years: params.years,
        Recursive: true,
        ImageTypeLimit: 1,
        EnableImageTypes: "Primary,Backdrop,Thumb",
      },
    });
    return data;
  }

  async getItemDetail(itemId: string): Promise<JellyfinItem> {
    const userId = this.server.userId;
    if (!userId) throw new Error("Not authenticated. User ID is missing.");

    // GET /Items/{itemId} only accepts itemId + userId — no `fields` param — so
    // it can't guarantee Overview/People/Studios/MediaSources/ExternalUrls the
    // detail screen needs. Use the list endpoint instead, which does support
    // `fields`, filtered to a single item.
    // TODO: possibly revisit + maybe swap to single endpoint with no fields param
    const { data } = await this.client.get<JellyfinItemsResponse>("/Items", {
      params: {
        ids: itemId,
        userId,
        fields:
          "Overview,PrimaryImageAspectRatio,MediaSources,Genres,Studios,People,ExternalUrls",
        limit: 1,
      },
    });
    return data.Items[0];
  }

  // ─── Resume / Latest ────────────────────────────────

  async getResumeItems(limit: number = 12): Promise<JellyfinItemsResponse> {
    const userId = this.server.userId;
    if (!userId) throw new Error("Not authenticated. User ID is missing.");

    const { data } = await this.client.get("/UserItems/Resume", {
      params: {
        userId,
        Limit: limit,
        Fields: "Overview,PrimaryImageAspectRatio",
        ImageTypeLimit: 1,
        EnableImageTypes: "Primary,Backdrop,Thumb",
        MediaTypes: "Video",
      },
    });
    return data;
  }

  async getLatestItems(
    parentId?: string,
    limit: number = 16,
  ): Promise<JellyfinItem[]> {
    const userId = this.server.userId;
    if (!userId) throw new Error("Not authenticated. User ID is missing.");

    const { data } = await this.client.get("/Items/Latest", {
      params: {
        userId,
        ParentId: parentId,
        Limit: limit,
        Fields: "Overview,PrimaryImageAspectRatio",
        ImageTypeLimit: 1,
        EnableImageTypes: "Primary,Backdrop,Thumb",
      },
    });
    return data;
  }

  // ─── Shows (Seasons & Episodes) ─────────────────────

  async getSeasons(seriesId: string): Promise<JellyfinItemsResponse> {
    const userId = this.server.userId;
    if (!userId) throw new Error("Not authenticated. User ID is missing.");

    const { data } = await this.client.get(`/Shows/${seriesId}/Seasons`, {
      params: {
        userId,
        fields: "Overview,PrimaryImageAspectRatio",
        enableImages: true,
        imageTypeLimit: 1,
        enableImageTypes: "Primary,Backdrop,Thumb",
      },
    });
    return data;
  }

  async getEpisodes(
    seriesId: string,
    seasonId?: string,
  ): Promise<JellyfinItemsResponse> {
    const userId = this.server.userId;
    if (!userId) throw new Error("Not authenticated. User ID is missing.");

    const { data } = await this.client.get(`/Shows/${seriesId}/Episodes`, {
      params: {
        userId,
        seasonId,
        fields: "Overview,PrimaryImageAspectRatio,MediaSources",
        sortBy: "AiredEpisodeOrder",
        enableImages: true,
        imageTypeLimit: 1,
        enableImageTypes: "Primary,Backdrop,Thumb",
      },
    });
    return data;
  }

  // ─── Playback Handshake ──────────────────────────────

  /**
   * Negotiates a playback session with the server. Returns the MediaSource(s)
   * actually available to play and the server-issued PlaySessionId — both
   * required before building a stream URL. `MediaSourceId` on a stream URL
   * only coincidentally equals `itemId` for single-version items, and a
   * client-invented PlaySessionId won't correlate with what the server
   * tracks for stop/kill-transcode.
   */
  async getPlaybackInfo(
    itemId: string,
    opts: {
      maxStreamingBitrate?: number;
      startTimeTicks?: number;
      audioStreamIndex?: number;
      subtitleStreamIndex?: number;
      mediaSourceId?: string;
    } = {},
  ): Promise<JellyfinPlaybackInfoResponse> {
    const userId = this.server.userId;
    if (!userId) throw new Error("Not authenticated. User ID is missing.");

    const { data } = await this.client.post(`/Items/${itemId}/PlaybackInfo`, {
      UserId: userId,
      MaxStreamingBitrate: opts.maxStreamingBitrate,
      StartTimeTicks: opts.startTimeTicks,
      AudioStreamIndex: opts.audioStreamIndex,
      SubtitleStreamIndex: opts.subtitleStreamIndex,
      MediaSourceId: opts.mediaSourceId,
      EnableTranscoding: true,
      AllowVideoStreamCopy: true,
      AllowAudioStreamCopy: true,
    });
    return data;
  }

  // ─── Streaming URLs ─────────────────────────────────

  // No `api_key` here: per the spec, GET /Videos/{itemId}/stream requires no
  // authentication at all, so putting the access token in the URL is a no-op
  // that just leaks it into logs, caches, and any proxy in between.
  getStreamUrl(itemId: string): string {
    return `${this.server.url}/Videos/${itemId}/stream?static=true`;
  }

  // Unlike getStreamUrl above, /master.m3u8 DOES require auth. `api_key` here
  // is undocumented (the spec only lists the Authorization header), but the
  // server still honours it, and expo-video can't attach headers to the HLS
  // segment requests it makes internally — so the query param stays.
  // NOTE: a `startTimeTicks` param was tried here (server-side resume offset
  // baked into the URL, avoiding a client-side seek into un-transcoded
  // content) but broke playback entirely against the live server — the
  // request came back as something the player couldn't load at all, on both
  // an initial resume and a mid-playback replaceAsync. Reverted pending a
  // known-correct contract (P14's TranscodingUrl-from-PlaybackInfo work is
  // the better path here — inspect a real response rather than guessing at
  // hand-built query params).
  getHlsStreamUrl(
    itemId: string,
    playSessionId: string,
    mediaSourceId: string,
    maxBitrate?: number | null,
    audioStreamIndex?: number,
  ): string {
    const token = this.server.accessToken ?? "";
    let url = `${this.server.url}/Videos/${itemId}/master.m3u8?api_key=${token}&DeviceId=${this.deviceId}&playSessionId=${playSessionId}&MediaSourceId=${mediaSourceId}&VideoCodec=h264&AudioCodec=aac&MaxAudioChannels=6&TranscodingMaxAudioChannels=6&SegmentContainer=ts`;
    if (maxBitrate && maxBitrate > 0) {
      url += `&videoBitRate=${maxBitrate}`;
    }
    if (audioStreamIndex !== undefined && audioStreamIndex !== null) {
      url += `&audioStreamIndex=${audioStreamIndex}`;
    }
    return url;
  }

  // ─── Image URLs ─────────────────────────────────────

  /** Pass the item's `ImageTags[imageType]` as `tag` so client/CDN caches invalidate when artwork changes. */
  getImageUrl(
    itemId: string,
    imageType: "Primary" | "Backdrop" | "Thumb" | "Banner" | "Logo" = "Primary",
    maxWidth?: number,
    maxHeight?: number,
    tag?: string,
  ): string {
    let url = `${this.server.url}/Items/${itemId}/Images/${imageType}`;
    const params: string[] = [];
    if (maxWidth) params.push(`maxWidth=${maxWidth}`);
    if (maxHeight) params.push(`maxHeight=${maxHeight}`);
    if (tag) params.push(`tag=${tag}`);
    params.push("quality=90");
    if (params.length) url += `?${params.join("&")}`;
    return url;
  }

  // ─── Playback Session Reporting ─────────────────────

  async reportPlaybackStart(
    itemId: string,
    positionTicks: number = 0,
    playSessionId: string,
    opts: {
      playMethod: JellyfinPlayMethod;
      mediaSourceId?: string;
      audioStreamIndex?: number;
      subtitleStreamIndex?: number;
      canSeek?: boolean;
    },
  ): Promise<void> {
    await this.client.post("/Sessions/Playing", {
      ItemId: itemId,
      PositionTicks: positionTicks,
      PlayMethod: opts.playMethod,
      PlaySessionId: playSessionId,
      MediaSourceId: opts.mediaSourceId,
      AudioStreamIndex: opts.audioStreamIndex,
      SubtitleStreamIndex: opts.subtitleStreamIndex,
      CanSeek: opts.canSeek ?? true,
    });
  }

  async reportPlaybackProgress(
    itemId: string,
    positionTicks: number,
    isPaused: boolean = false,
    playSessionId: string,
    opts: {
      playMethod: JellyfinPlayMethod;
      mediaSourceId?: string;
      audioStreamIndex?: number;
      subtitleStreamIndex?: number;
      canSeek?: boolean;
    },
  ): Promise<void> {
    await this.client.post("/Sessions/Playing/Progress", {
      ItemId: itemId,
      PositionTicks: positionTicks,
      IsPaused: isPaused,
      PlayMethod: opts.playMethod,
      PlaySessionId: playSessionId,
      MediaSourceId: opts.mediaSourceId,
      AudioStreamIndex: opts.audioStreamIndex,
      SubtitleStreamIndex: opts.subtitleStreamIndex,
      CanSeek: opts.canSeek ?? true,
    });
  }

  async reportPlaybackStopped(
    itemId: string,
    positionTicks: number,
    playSessionId: string,
  ): Promise<void> {
    await this.client.post("/Sessions/Playing/Stopped", {
      ItemId: itemId,
      PositionTicks: positionTicks,
      PlaySessionId: playSessionId,
    });
  }

  async deleteActiveEncoding(playSessionId: string): Promise<void> {
    await this.client.delete("/Videos/ActiveEncodings", {
      params: { playSessionId: playSessionId, DeviceId: this.deviceId },
    });
  }

  // ─── Search ──────────────────────────────────────────

  // TODO: `SearchScore` isn't a real `ItemSortBy` member in 10.11 — swapped for
  // `SortName` below. The purpose-built `GET /Search/Hints` endpoint returns
  // relevance-ranked results instead, but its response is `SearchHintResult`
  // (`{ SearchHints, TotalRecordCount }`), a different shape from
  // `BaseItemDtoQueryResult` — switching would ripple into how callers of
  // `search()` map results (see services/hooks/useSearch.ts:53-70). Follow up for potential swap
  async search(
    searchTerm: string,
    limit: number = 20,
  ): Promise<JellyfinItemsResponse> {
    return this.getItems({
      searchTerm,
      limit,
      includeItemTypes: "Movie,Series,Episode,MusicAlbum,MusicArtist,Audio",
      sortBy: "SortName",
      sortOrder: "Ascending",
    });
  }
}
