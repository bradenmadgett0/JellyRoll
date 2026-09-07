function loadBuildDeviceProfile(os: "ios" | "android") {
  jest.resetModules();
  const { Platform } = require("react-native");
  Platform.OS = os;
  return (require("./deviceProfile") as typeof import("./deviceProfile"))
    .buildDeviceProfile;
}

describe("buildDeviceProfile", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("excludes mkv from DirectPlay containers on iOS (AVPlayer has no Matroska demuxer)", () => {
    const buildDeviceProfile = loadBuildDeviceProfile("ios");
    const profile = buildDeviceProfile();
    expect(profile.DirectPlayProfiles[0].Container).toBe("mp4,m4v,mov");
    expect(profile.DirectPlayProfiles[0].Container).not.toMatch(/mkv/);
  });

  it("includes mkv in DirectPlay containers on Android (ExoPlayer supports it)", () => {
    const buildDeviceProfile = loadBuildDeviceProfile("android");
    const profile = buildDeviceProfile();
    expect(profile.DirectPlayProfiles[0].Container).toBe("mp4,m4v,mov,mkv");
  });

  it("never declares hevc as a transcoding output codec, on either platform", () => {
    for (const os of ["ios", "android"] as const) {
      const buildDeviceProfile = loadBuildDeviceProfile(os);
      const profile = buildDeviceProfile();
      expect(profile.TranscodingProfiles[0].VideoCodec).toBe("h264");
    }
  });

  it("excludes AC3/E-AC3 from DirectPlay and transcoding audio codecs", () => {
    const buildDeviceProfile = loadBuildDeviceProfile("ios");
    const profile = buildDeviceProfile();
    expect(profile.DirectPlayProfiles[0].AudioCodec).not.toMatch(/ac3/i);
    expect(profile.TranscodingProfiles[0].AudioCodec).not.toMatch(/ac3/i);
  });

  it("builds an HLS/ts transcoding profile", () => {
    const buildDeviceProfile = loadBuildDeviceProfile("ios");
    const profile = buildDeviceProfile();
    expect(profile.TranscodingProfiles[0]).toMatchObject({
      Type: "Video",
      Container: "ts",
      Protocol: "hls",
      AudioCodec: "aac",
    });
  });
});
