import { JellyfinClient } from "./client";
// import { ServerConfig } from "@/types/server";
import {
  JellyfinLibraryResponse,
  JellyfinItemsResponse,
  JellyfinItem,
  JellyfinDeviceProfile,
  JellyfinPlaybackInfoResponse,
  JellyfinMediaSource,
  JellyfinPlayMethod
} from "@/types/jellyfin";

export class JellyfinMediaClient {
  constructor(private readonly root: JellyfinClient) {}

  private get client() {
    return this.root.client;
  }

  private get server() {
    return this.root.server;
  }

  private get deviceId() {
    return this.root.deviceId;
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
      /**
       * CAUTION — verified broken against a live server, twice. Jellyfin's
       * HLS playlist always spans the FULL item (confirmed: an offset stream
       * still reported the complete runtime), so this only moves where the
       * encoder begins, not where the timeline begins. The player still opens
       * at playlist position 0 and asks for segment 0, which an encoder
       * started partway in never produces — the load fails outright with
       * "resource unavailable". Seeking is the client's job; Jellyfin
       * restarts the transcode itself when a distant segment is requested.
       */
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
