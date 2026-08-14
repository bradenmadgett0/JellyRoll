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

export const DEFAULT_QUALITY_PRESET: QualityPreset =
  QUALITY_PRESETS[QUALITY_PRESETS.length - 1];

/** Formats a bitrate in bits/sec as a human label, e.g. "8.0 Mbps" / "800 Kbps". Null/non-positive → null. */
export function formatBitrate(bps: number | null | undefined): string | null {
  if (!bps || bps <= 0) return null;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${Math.round(bps / 1_000)} Kbps`;
  return `${bps} bps`;
}

/**
 * Quality presets for a given media's source bitrate: a dynamic "Max" entry
 * (uncapped, but labeled with the source's actual bitrate) prepended to the
 * fixed ladder, or just the fixed ladder if the source bitrate is unknown.
 */
export function buildQualityPresets(
  mediaBitrate?: number | null,
): QualityPreset[] {
  if (mediaBitrate && mediaBitrate > 0) {
    return [
      { label: `Max - ${formatBitrate(mediaBitrate) ?? ""}`, maxBitrate: mediaBitrate },
      ...QUALITY_PRESETS,
    ];
  }
  return QUALITY_PRESETS;
}

// ─── Ticks (Jellyfin's 100ns time unit) ──────────────────────────────
export const TICKS_PER_SECOND = 10_000_000;

export function ticksToSeconds(ticks: number): number {
  return ticks / TICKS_PER_SECOND;
}

export function secondsToTicks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}
