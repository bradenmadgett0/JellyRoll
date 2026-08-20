/**
 * Jellyfin API Client
 * Handles authentication, library browsing, and media streaming
 */

import axios, { AxiosInstance } from "axios";
import {
    JellyfinAuthResponse,
    JellyfinDeviceProfile,
    JellyfinItem,
    JellyfinItemsResponse,
    JellyfinLibraryResponse,
    JellyfinMediaSource,
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
      deviceProfile?: JellyfinDeviceProfile;
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
      DeviceProfile: opts.deviceProfile,
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

  /**
   * Fetches (and discards) the first segment of a transcoding HLS stream so
   * its slow part — ffmpeg spinning up and opening/probing the source file —
   * already happened by the time the player asks for the same URL. Confirmed
   * live: a heavy multi-track 4K remux took ~17s to produce its first
   * segment once, then ~0.02s on an identical second request (Jellyfin
   * serves the already-generated .ts file from its transcode cache). Only
   * meaningful for a TranscodingUrl (Transcode/DirectStream) — DirectPlay's
   * static /stream endpoint has no transcode job to warm up, and calling
   * this on it would just be a wasted extra request.
   *
   * Self-authenticating URLs only (TranscodingUrl carries its own `ApiKey`
   * query param — see resolveStreamUrl), so no auth header is needed here.
   * Best-effort: any failure (network, malformed playlist) is swallowed —
   * the player will make the same requests itself and surface a real error
   * through its own status if something's actually wrong.
   *
   * TODO: double-check this actually helps on-device. Verified live from
   * this sandbox against the server directly, but never through expo-video
   * itself — confirm the perceived stall before playback starts is
   * genuinely shorter with this in place, not just that the raw HTTP
   * timing improves.
   */
  async prewarmHlsStream(masterUrl: string): Promise<void> {
    try {
      const masterText = await (await fetch(masterUrl)).text();
      const mainLine = masterText
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith("#"));
      if (!mainLine) return;
      const mainUrl = new URL(mainLine, masterUrl).toString();

      const mainText = await (await fetch(mainUrl)).text();
      const segLine = mainText
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith("#"));
      if (!segLine) return;
      const segUrl = new URL(segLine, mainUrl).toString();

      await fetch(segUrl);
    } catch {
      // Best-effort — see doc comment above.
    }
  }

  /**
   * Resolves the actual URL to hand to the player from a negotiated
   * MediaSource, preferring the server's own TranscodingUrl over hand-built
   * query params (P14). Verified live against a real server:
   *  - TranscodingUrl comes back server-relative (needs server.url prefixed)
   *    and already carries its own `ApiKey` query param — no extra auth
   *    needed on top of it.
   *  - On this server/version, SupportsDirectStream is never true unless
   *    SupportsDirectPlay is also true (no distinct remux-only case was
   *    observed even when forcing a container mismatch or a bitrate cap) —
   *    but the flag is still checked in case another server version differs.
   *  - A TranscodingUrl-less, non-direct-playable source (extraneous of
   *    ErrorCode, which the caller already handles separately) shouldn't
   *    happen, but falls back to the old hand-built HLS URL rather than
   *    leaving playback with nothing to load.
   */
  resolveStreamUrl(
    itemId: string,
    source: JellyfinMediaSource,
    playSessionId: string,
    maxBitrate?: number | null,
    audioStreamIndex?: number,
  ): { url: string; playMethod: JellyfinPlayMethod } {
    if (source.TranscodingUrl) {
      return {
        url: `${this.server.url}${source.TranscodingUrl}`,
        playMethod: source.SupportsDirectStream ? "DirectStream" : "Transcode",
      };
    }
    if (source.SupportsDirectPlay) {
      return { url: this.getStreamUrl(itemId), playMethod: "DirectPlay" };
    }
    return {
      url: this.getHlsStreamUrl(
        itemId,
        playSessionId,
        source.Id,
        maxBitrate,
        audioStreamIndex,
      ),
      playMethod: "Transcode",
    };
  }

  // Unlike getStreamUrl above, /master.m3u8 DOES require auth. `api_key` here
  // is undocumented (the spec only lists the Authorization header), but the
  // server still honours it, and expo-video can't attach headers to the HLS
  // segment requests it makes internally — so the query param stays.
  // Only reached as resolveStreamUrl's last-resort fallback now (P14) — the
  // primary path prefers the server's own TranscodingUrl.
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
    mediaSourceId?: string,
  ): Promise<void> {
    await this.client.post("/Sessions/Playing/Stopped", {
      ItemId: itemId,
      PositionTicks: positionTicks,
      PlaySessionId: playSessionId,
      MediaSourceId: mediaSourceId,
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
