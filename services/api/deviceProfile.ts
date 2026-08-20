/**
 * DeviceProfile describing what expo-video can actually play, sent to the
 * server's PlaybackInfo handshake (P14) so it negotiates DirectPlay vs
 * Transcode itself instead of the client forcing VideoCodec=h264&AudioCodec=aac
 * on every source regardless of whether it was already compatible.
 *
 * Deliberately conservative, per the ticket's own guidance. Two confirmed
 * on-device findings so far:
 *
 * - Platform split on `mkv`: originally in DirectPlayProfile's container
 *   list on both platforms, but a real mkv/hevc/aac file failed on iOS with
 *   "Cannot Open" — AVPlayer/AVFoundation has no native Matroska demuxer, so
 *   it can never open an .mkv container directly regardless of the codecs
 *   inside being otherwise compatible. Android's ExoPlayer does support mkv
 *   natively, so it stays there.
 * - HEVC is NOT a TranscodingProfile output codec (h264 only), even though
 *   it's still a valid DirectPlay codec. On a real iPhone 13 Pro Max, two
 *   SDR mkv/hevc files that got HEVC *stream-copied* into the HLS/ts
 *   container (no re-encode — codec allowed, only the container needed
 *   fixing) played audio with no video (stuck on a placeholder frame). A
 *   third HDR file played fine, but only because its DeviceProfile-forced
 *   HDR→SDR tonemap happens to require a full re-encode regardless of
 *   TranscodingProfile.VideoCodec, and Jellyfin encoded it to h264, not
 *   HEVC — so "HEVC via HLS" was never actually exercised successfully; only
 *   "fresh h264 encode" was. ffmpeg itself decodes the copied HEVC segments
 *   with zero errors, so the bitstream isn't corrupt — this looks like an
 *   AVPlayer-specific quirk with HEVC *stream-copied* into fragmented
 *   MPEG-TS specifically (a known category of issue elsewhere), not a
 *   decode-capability gap. Forcing a real h264 re-encode for these cases
 *   costs more server CPU than a stream-copy would have, but the h264/HLS
 *   path has repeated confirmed successes and zero failures so far.
 * - AC3/E-AC3 are left out of both DirectPlay and TranscodingProfile audio
 *   codecs on both platforms: passthrough support is unverified, and stock
 *   ExoPlayer (no bundled FFmpeg extension) can't decode AC3 at all — so
 *   those sources fall back to the AAC transcoding profile below rather
 *   than being declared direct-playable.
 */
import { Platform } from "react-native";
import { JellyfinDeviceProfile } from "../../types/jellyfin";

const DIRECT_PLAY_CONTAINERS =
  Platform.OS === "android" ? "mp4,m4v,mov,mkv" : "mp4,m4v,mov";
const DIRECT_PLAY_VIDEO_CODECS = "h264,hevc";
const DIRECT_PLAY_AUDIO_CODECS = "aac,mp3";

export function buildDeviceProfile(): JellyfinDeviceProfile {
  return {
    MaxStreamingBitrate: 120_000_000,
    DirectPlayProfiles: [
      {
        Type: "Video",
        Container: DIRECT_PLAY_CONTAINERS,
        VideoCodec: DIRECT_PLAY_VIDEO_CODECS,
        AudioCodec: DIRECT_PLAY_AUDIO_CODECS,
      },
    ],
    TranscodingProfiles: [
      {
        Type: "Video",
        Container: "ts",
        Protocol: "hls",
        // h264 only, not hevc — see the module doc comment above: HEVC
        // stream-copied into HLS/ts failed on a real device even though the
        // codec itself is DirectPlay-eligible. A full h264 re-encode is
        // more expensive server-side than a copy would have been, but it's
        // the only transcode output confirmed working so far.
        VideoCodec: "h264",
        AudioCodec: "aac",
        Context: "Streaming",
        MaxAudioChannels: "6",
        MinSegments: 1,
        BreakOnNonKeyFrames: true,
      },
    ],
  };
}
