// ─── Quality presets (bitrate in bps, null = no cap / direct stream) ──
export interface QualityPreset {
  label: string;
  maxBitrate: number | null;
}

export const QUALITY_PRESETS: QualityPreset[] = [
  { label: "1080p - 20 Mbps", maxBitrate: 20_000_000 },
  { label: "1080p - 10 Mbps", maxBitrate: 10_000_000 },
  { label: "720p - 8 Mbps", maxBitrate: 8_000_000 },
  { label: "720p - 4 Mbps", maxBitrate: 4_000_000 },
  { label: "480p - 3 Mbps", maxBitrate: 3_000_000 },
  { label: "480p - 1.5 Mbps", maxBitrate: 1_500_000 },
  { label: "360p - 800 Kbps", maxBitrate: 800_000 },
  { label: "Auto (Max)", maxBitrate: null },
];
