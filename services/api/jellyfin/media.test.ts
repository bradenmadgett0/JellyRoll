import { JellyfinMediaClient } from "./media";
import type { JellyfinClient } from "./client";
import type { JellyfinMediaSource } from "@/types/jellyfin";
import { makeServerConfig } from "@/test/fixtures";

function makeMediaClient(overrides: { userId?: string | undefined } = {}) {
  const get = jest.fn().mockResolvedValue({ data: {} });
  const post = jest.fn().mockResolvedValue({ data: {} });
  const del = jest.fn().mockResolvedValue({ data: {} });
  const server = makeServerConfig(
    "userId" in overrides ? { userId: overrides.userId } : {},
  );
  const root = {
    client: { get, post, delete: del },
    server,
    deviceId: server.deviceId,
  } as unknown as JellyfinClient;
  return { media: new JellyfinMediaClient(root), get, post, del, server };
}

function makeMediaSource(overrides: Partial<JellyfinMediaSource> = {}): JellyfinMediaSource {
  return {
    Id: "source-1",
    Name: "Movie File",
    Container: "mkv",
    SupportsTranscoding: true,
    SupportsDirectStream: false,
    SupportsDirectPlay: false,
    ...overrides,
  };
}

describe("JellyfinMediaClient — auth guard", () => {
  it("throws when the server has no userId", async () => {
    const { media } = makeMediaClient({ userId: undefined });
    await expect(media.getLibraries()).rejects.toThrow(/Not authenticated/);
    await expect(media.getItems({})).rejects.toThrow(/Not authenticated/);
  });
});

describe("JellyfinMediaClient — getStreamUrl", () => {
  it("builds a static stream URL with no auth token in it", () => {
    const { media, server } = makeMediaClient();
    expect(media.getStreamUrl("item-1")).toBe(
      `${server.url}/Videos/item-1/stream?static=true`,
    );
  });
});

describe("JellyfinMediaClient — getHlsStreamUrl", () => {
  it("includes the api_key, device id and codec/segment params", () => {
    const { media, server } = makeMediaClient();
    const url = media.getHlsStreamUrl("item-1", "session-1", "source-1");
    expect(url).toContain(`${server.url}/Videos/item-1/master.m3u8?`);
    expect(url).toContain(`api_key=${server.accessToken}`);
    expect(url).toContain(`DeviceId=${server.deviceId}`);
    expect(url).toContain("playSessionId=session-1");
    expect(url).toContain("MediaSourceId=source-1");
    expect(url).toContain("VideoCodec=h264");
    expect(url).toContain("AudioCodec=aac");
    expect(url).not.toContain("videoBitRate");
    expect(url).not.toContain("audioStreamIndex");
  });

  it("appends videoBitRate only when a positive maxBitrate is given", () => {
    const { media } = makeMediaClient();
    expect(media.getHlsStreamUrl("i", "s", "m", 5_000_000)).toContain(
      "videoBitRate=5000000",
    );
    expect(media.getHlsStreamUrl("i", "s", "m", 0)).not.toContain("videoBitRate");
    expect(media.getHlsStreamUrl("i", "s", "m", undefined)).not.toContain(
      "videoBitRate",
    );
  });

  it("appends audioStreamIndex only when explicitly provided (0 is valid)", () => {
    const { media } = makeMediaClient();
    expect(media.getHlsStreamUrl("i", "s", "m", undefined, 0)).toContain(
      "audioStreamIndex=0",
    );
    expect(media.getHlsStreamUrl("i", "s", "m", undefined, 2)).toContain(
      "audioStreamIndex=2",
    );
    expect(media.getHlsStreamUrl("i", "s", "m")).not.toContain(
      "audioStreamIndex",
    );
  });
});

describe("JellyfinMediaClient — getImageUrl", () => {
  it("defaults to the Primary image type with only quality=90", () => {
    const { media, server } = makeMediaClient();
    expect(media.getImageUrl("item-1")).toBe(
      `${server.url}/Items/item-1/Images/Primary?quality=90`,
    );
  });

  it("includes maxWidth, maxHeight and tag when given, always with quality last", () => {
    const { media, server } = makeMediaClient();
    expect(
      media.getImageUrl("item-1", "Backdrop", 800, 450, "abc123"),
    ).toBe(
      `${server.url}/Items/item-1/Images/Backdrop?maxWidth=800&maxHeight=450&tag=abc123&quality=90`,
    );
  });
});

describe("JellyfinMediaClient — resolveStreamUrl", () => {
  it("prefers the server's TranscodingUrl, prefixed with server.url, and reports DirectStream when supported", () => {
    const { media, server } = makeMediaClient();
    const source = makeMediaSource({
      TranscodingUrl: "/videos/item-1/master.m3u8?foo=bar",
      SupportsDirectStream: true,
    });
    const result = media.resolveStreamUrl("item-1", source, "session-1");
    expect(result).toEqual({
      url: `${server.url}/videos/item-1/master.m3u8?foo=bar`,
      playMethod: "DirectStream",
    });
  });

  it("reports Transcode when a TranscodingUrl exists but DirectStream isn't supported", () => {
    const { media } = makeMediaClient();
    const source = makeMediaSource({
      TranscodingUrl: "/videos/item-1/master.m3u8",
      SupportsDirectStream: false,
    });
    const result = media.resolveStreamUrl("item-1", source, "session-1");
    expect(result.playMethod).toBe("Transcode");
  });

  it("falls back to the static stream URL with DirectPlay when no TranscodingUrl and DirectPlay is supported", () => {
    const { media, server } = makeMediaClient();
    const source = makeMediaSource({ SupportsDirectPlay: true });
    const result = media.resolveStreamUrl("item-1", source, "session-1");
    expect(result).toEqual({
      url: `${server.url}/Videos/item-1/stream?static=true`,
      playMethod: "DirectPlay",
    });
  });

  it("falls back to a hand-built HLS URL as a last resort when neither is available", () => {
    const { media } = makeMediaClient();
    const source = makeMediaSource({
      Id: "source-9",
      SupportsDirectPlay: false,
    });
    const result = media.resolveStreamUrl(
      "item-1",
      source,
      "session-1",
      3_000_000,
      1,
    );
    expect(result.playMethod).toBe("Transcode");
    expect(result.url).toBe(
      media.getHlsStreamUrl("item-1", "session-1", "source-9", 3_000_000, 1),
    );
  });
});

describe("JellyfinMediaClient — getItems", () => {
  it("sends sensible defaults and passes the userId", async () => {
    const { media, get, server } = makeMediaClient();
    await media.getItems({ parentId: "lib-1" });
    expect(get).toHaveBeenCalledWith(
      "/Items",
      expect.objectContaining({
        params: expect.objectContaining({
          userId: server.userId,
          ParentId: "lib-1",
          SortBy: "SortName",
          SortOrder: "Ascending",
          StartIndex: 0,
          Recursive: true,
          ImageTypeLimit: 1,
        }),
      }),
    );
  });

  it("lets callers override the defaults", async () => {
    const { media, get } = makeMediaClient();
    await media.getItems({ sortBy: "DateCreated", sortOrder: "Descending", startIndex: 40 });
    const params = get.mock.calls[0][1].params;
    expect(params.SortBy).toBe("DateCreated");
    expect(params.SortOrder).toBe("Descending");
    expect(params.StartIndex).toBe(40);
  });
});

describe("JellyfinMediaClient — search", () => {
  it("delegates to getItems with SortName (not the invalid SearchScore) and a media type filter", async () => {
    const { media, get } = makeMediaClient();
    await media.search("dio", 5);
    expect(get).toHaveBeenCalledWith(
      "/Items",
      expect.objectContaining({
        params: expect.objectContaining({
          SearchTerm: "dio",
          Limit: 5,
          SortBy: "SortName",
          SortOrder: "Ascending",
          IncludeItemTypes: "Movie,Series,Episode,MusicAlbum,MusicArtist,Audio",
        }),
      }),
    );
  });
});

describe("JellyfinMediaClient — getPlaybackInfo", () => {
  it("posts the negotiation body with transcoding/stream-copy always enabled", async () => {
    const { media, post, server } = makeMediaClient();
    const deviceProfile = { MaxStreamingBitrate: 1 } as any;
    await media.getPlaybackInfo("item-1", {
      maxStreamingBitrate: 8_000_000,
      audioStreamIndex: 1,
      mediaSourceId: "source-1",
      deviceProfile,
    });
    expect(post).toHaveBeenCalledWith(
      "/Items/item-1/PlaybackInfo",
      expect.objectContaining({
        UserId: server.userId,
        MaxStreamingBitrate: 8_000_000,
        AudioStreamIndex: 1,
        MediaSourceId: "source-1",
        DeviceProfile: deviceProfile,
        EnableTranscoding: true,
        AllowVideoStreamCopy: true,
        AllowAudioStreamCopy: true,
      }),
    );
  });
});

describe("JellyfinMediaClient — reporting", () => {
  it("reportPlaybackStart posts CanSeek true by default", async () => {
    const { media, post } = makeMediaClient();
    await media.reportPlaybackStart("item-1", 0, "session-1", {
      playMethod: "DirectPlay",
    });
    expect(post).toHaveBeenCalledWith(
      "/Sessions/Playing",
      expect.objectContaining({ CanSeek: true, PlayMethod: "DirectPlay" }),
    );
  });

  it("reportPlaybackProgress carries isPaused and position through", async () => {
    const { media, post } = makeMediaClient();
    await media.reportPlaybackProgress("item-1", 12345, true, "session-1", {
      playMethod: "Transcode",
    });
    expect(post).toHaveBeenCalledWith(
      "/Sessions/Playing/Progress",
      expect.objectContaining({
        PositionTicks: 12345,
        IsPaused: true,
        PlayMethod: "Transcode",
      }),
    );
  });

  it("deleteActiveEncoding sends the playSessionId and deviceId", async () => {
    const { media, del, server } = makeMediaClient();
    await media.deleteActiveEncoding("session-1");
    expect(del).toHaveBeenCalledWith("/Videos/ActiveEncodings", {
      params: { playSessionId: "session-1", DeviceId: server.deviceId },
    });
  });
});
