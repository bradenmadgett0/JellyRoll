/**
 * DeviceProfile describing what expo-video can actually play, sent to the
 * server's PlaybackInfo handshake (P14) so it negotiates DirectPlay vs
 * Transcode itself instead of the client forcing VideoCodec=h264&AudioCodec=aac
 * on every source regardless of whether it was already compatible.
 *
 * Deliberately conservative, per the ticket's own guidance — same profile on
 * iOS and Android for now rather than guessing at a per-platform split.
 * AC3/E-AC3 are left out of both DirectPlay and TranscodingProfile audio
 * codecs: passthrough support is unverified on either platform, and stock
 * ExoPlayer (no bundled FFmpeg extension) can't decode AC3 at all — so
 * those sources fall back to the AAC transcoding profile below rather than
 * being declared direct-playable.
 */
import { JellyfinDeviceProfile } from "../../types/jellyfin";

const DIRECT_PLAY_CONTAINERS = "mp4,m4v,mov,mkv";
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
        // h264,hevc (not just h264): a source whose video codec is already
        // direct-play-eligible but whose container/audio isn't should get a
        // video stream-copy, not a full re-encode.
        VideoCodec: "h264,hevc",
        AudioCodec: "aac",
        Context: "Streaming",
        MaxAudioChannels: "6",
        MinSegments: 1,
        BreakOnNonKeyFrames: true,
      },
    ],
  };
}
