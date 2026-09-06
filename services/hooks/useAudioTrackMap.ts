/**
 * useAudioTrackMap — Resolves a Jellyfin audio stream index to an
 * expo-video AudioTrack so a DirectPlay source can switch audio *in place*
 * (an AVPlayer media-selection change / ExoPlayer track override) instead of
 * renegotiating PlaybackInfo, killing the transcode, and reloading the
 * player — see switchStream in player.tsx for the path this avoids.
 *
 * Only DirectPlay is eligible. Jellyfin bakes a single audio track into an
 * HLS transcode job (AudioStreamIndex is an ffmpeg input, not a playlist
 * rendition), so a transcoded source has exactly one track and there is
 * nothing to switch between locally — that case must still renegotiate.
 *
 * ─── Why the mapping is non-trivial ─────────────────────────────────────
 * The two sides share no identifier. Jellyfin's MediaStream.Index is the
 * ffprobe stream index, absolute across all stream types (video 0, audio
 * 1..n, subtitles after) — it's what the picker emits, what
 * mediaSettingsStore persists, and what usePlaybackReporting reports. The
 * player's AudioTrack carries only { id, language, label }, and not even
 * that consistently across platforms (see the notes below). No codec, no
 * channel count, no index.
 *
 * Worse, neither platform is guaranteed to surface every track:
 *  - iOS drops any track whose locale is nil (Records/Tracks.swift — the
 *    `from(mediaSelectionOption:)` guard returns nil), which is common for
 *    untagged commentary tracks.
 *  - Android drops any track whose Format.id is null (records/Tracks.kt).
 * So a naive "nth player track == nth Jellyfin audio stream" mapping breaks
 * silently: one dropped track shifts every index after it, and the user
 * gets a different language than the one they picked, with no error.
 *
 * ─── The strategy: bucket by language, then match by position ────────────
 * Both sides enumerate in container order, and language is the only field
 * present on both. So group each side by normalized language and match
 * positionally *within* each bucket. A track iOS drops for a nil locale has
 * no language, so it can't be in any named bucket — its absence therefore
 * can't shift the ordering inside another one, which is exactly the failure
 * mode global positioning has.
 *
 * A bucket only produces mappings if it passes its guards (below);
 * otherwise its streams are simply omitted from the map. Absence is the
 * fallback signal — the caller renegotiates for anything it can't find,
 * which is precisely today's behaviour. There are no error states.
 */

import { useEventListener } from "expo";
import { AudioTrack, VideoPlayer } from "expo-video";
import { iso6392 } from "iso-639-2";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { JellyfinMediaStream, JellyfinPlayMethod } from "../../types/jellyfin";

/**
 * ISO 639-2 (bibliographic *and* terminology variants) → ISO 639-1.
 * Jellyfin reports 639-2 ("eng"), while both players report roughly 639-1
 * ("en"), sometimes with a region suffix. Reducing everything to 639-1 is
 * the common denominator. Languages with no 639-1 equivalent fall through
 * unchanged, which is fine: both sides go through this same function, so
 * they still agree.
 */
const TO_639_1: Record<string, string> = {};
for (const lang of iso6392) {
  if (!lang.iso6391) continue;
  TO_639_1[lang.iso6392B] = lang.iso6391;
  if (lang.iso6392T) TO_639_1[lang.iso6392T] = lang.iso6391;
}

/**
 * Bucket for tracks with no language metadata at all. Deliberately still a
 * real bucket rather than an early bail-out: on Android an untagged track
 * is present and addressable by id, so it maps fine, while on iOS it was
 * dropped entirely and the count guard rejects the bucket on its own. The
 * guards absorb the platform difference without branching on it.
 */
const UNKNOWN_LANGUAGE = "und";

function normalizeLanguage(code: string | null | undefined): string {
  if (!code) return UNKNOWN_LANGUAGE;
  const primary = code.split(/[-_]/)[0].toLowerCase(); // "en_US" / "en-US" → "en"
  return TO_639_1[primary] ?? primary;
}

/**
 * expo-video's AudioTrack type declares `id: string`, but the iOS
 * implementation never populates it — Records/Tracks.swift builds an
 * AudioTrack from language + label only. It is `undefined` at runtime on
 * iOS despite what the type says, so read it through a widened type rather
 * than trusting the declaration.
 */
function trackId(track: AudioTrack): string | undefined {
  return (track as { id?: string }).id;
}

/**
 * Android selects by Format.id, which is exact. iOS has no id and matches
 * on the (label, language) pair, so that pair is the identity there.
 */
function isSameTrack(
  a: AudioTrack | null | undefined,
  b: AudioTrack | null | undefined,
): boolean {
  if (!a || !b) return false;
  const aId = trackId(a);
  const bId = trackId(b);
  if (aId !== undefined && bId !== undefined) return aId === bId;
  return a.label === b.label && a.language === b.language;
}

function groupByLanguage<T>(
  items: T[],
  language: (item: T) => string | null | undefined,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = normalizeLanguage(language(item));
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

/**
 * Builds the Jellyfin stream index → player AudioTrack map. Exported for
 * direct testing; the hook below is the normal entry point.
 *
 * A bucket contributes mappings only if both guards pass. Otherwise its
 * streams are left out of the map and the caller falls back.
 */
export function buildAudioTrackMap(
  audioStreams: JellyfinMediaStream[],
  availableTracks: AudioTrack[],
): Map<number, AudioTrack> {
  const map = new Map<number, AudioTrack>();
  if (!audioStreams.length || !availableTracks.length) return map;

  const streamBuckets = groupByLanguage(
    [...audioStreams].sort((a, b) => a.Index - b.Index),
    (s) => s.Language,
  );
  const trackBuckets = groupByLanguage(availableTracks, (t) => t.language);

  for (const [language, streams] of streamBuckets) {
    const tracks = trackBuckets.get(language) ?? [];

    // Guard 1 — counts must agree, or position within the bucket is
    // meaningless. This is what catches a platform-dropped track: the
    // bucket that lost it is rejected, and every other bucket is untouched.
    if (tracks.length !== streams.length) continue;

    // Guard 2 — iOS ONLY, and it must stay that way.
    //
    // iOS resolves a selection by matching (displayName, locale) and taking
    // the first hit (VideoPlayerAudioTracks.swift), so two tracks with the
    // same label in one bucket make the second unaddressable — we'd hand
    // the player the right object and still get the first track back. iOS
    // labels come from AVMediaSelectionOption.displayName, which prefers
    // the embedded track title, so titled tracks are distinguishable and
    // untitled same-language ones are not.
    //
    // On Android this guard would be actively harmful: labels there are
    // built as Locale(language).displayLanguage (records/Tracks.kt), so
    // every track in a language bucket has the SAME label by construction.
    // Applying it would reject every multi-track bucket on the one platform
    // where selection is exact (by Format.id).
    if (
      Platform.OS === "ios" &&
      new Set(tracks.map((t) => t.label)).size !== tracks.length
    ) {
      continue;
    }

    streams.forEach((stream, i) => map.set(stream.Index, tracks[i]));
  }

  return map;
}

/** How long to wait for audioTrackChange before treating a switch as failed. */
const TRACK_CHANGE_TIMEOUT_MS = 1500;

/**
 * Applies a track and confirms the player actually honoured it.
 *
 * The static guards above can't see an ordering violation — they assume
 * both sides enumerate in container order, which is true of ffprobe,
 * AVFoundation media selection groups, and ExoPlayer track groups, but
 * isn't contractual. Verifying costs nothing when everything works and
 * turns a silently-wrong-language bug into a transparent fallback.
 */
async function selectAudioTrack(
  player: VideoPlayer,
  track: AudioTrack,
): Promise<boolean> {
  // Already selected: no audioTrackChange would fire, so waiting below
  // would just burn the full timeout before succeeding anyway.
  if (isSameTrack(player.audioTrack, track)) return true;

  const settled = new Promise<void>((resolve) => {
    const subscription = player.addListener("audioTrackChange", () => {
      clearTimeout(timer);
      subscription.remove();
      resolve();
    });
    const timer = setTimeout(() => {
      subscription.remove();
      resolve();
    }, TRACK_CHANGE_TIMEOUT_MS);
  });

  player.audioTrack = track;
  await settled;
  return isSameTrack(player.audioTrack, track);
}

// Stable identity so a caller memoizing on the map doesn't churn while the
// player has no tracks loaded yet.
const EMPTY_MAP: Map<number, AudioTrack> = new Map();

export interface UseAudioTrackMapOptions {
  player: VideoPlayer;
  /** The item's audio MediaStreams — the same list the picker is built from. */
  audioStreams: JellyfinMediaStream[];
  /** Local switching is DirectPlay-only; see the module doc comment. */
  playMethod: JellyfinPlayMethod | undefined;
}

export interface UseAudioTrackMapResult {
  /**
   * Attempts an in-place switch to the given Jellyfin audio stream index.
   * Resolves true if the player is now playing that track, false if the
   * track wasn't mappable or the player didn't honour the selection — in
   * which case the caller should fall back to a full renegotiation.
   */
  switchAudioTrack: (streamIndex: number) => Promise<boolean>;
}

export function useAudioTrackMap({
  player,
  audioStreams,
  playMethod,
}: UseAudioTrackMapOptions): UseAudioTrackMapResult {
  const [availableTracks, setAvailableTracks] = useState<AudioTrack[]>([]);

  // Both platforms emit this when a new player item finishes loading —
  // including after switchStream's replaceAsync, so the map rebuilds itself
  // for whatever source is now open.
  useEventListener(
    player,
    "availableAudioTracksChange",
    ({ availableAudioTracks }) => setAvailableTracks(availableAudioTracks),
  );

  // useVideoPlayer recreates the native player when its source string
  // changes (player.tsx creates it with a "" placeholder before hlsUrl
  // resolves), so tracks from a previous instance must not leak into the
  // new one's map. Reads the new player's current list rather than assuming
  // it's empty, in case it loaded before this effect ran.
  useEffect(() => {
    setAvailableTracks(player.availableAudioTracks ?? []);
  }, [player]);

  const trackMap = useMemo(() => {
    if (playMethod !== "DirectPlay") return EMPTY_MAP;
    return buildAudioTrackMap(audioStreams, availableTracks);
  }, [playMethod, audioStreams, availableTracks]);

  const switchAudioTrack = useCallback(
    async (streamIndex: number) => {
      const track = trackMap.get(streamIndex);
      if (!track) return false;
      return selectAudioTrack(player, track);
    },
    [player, trackMap],
  );

  return { switchAudioTrack };
}
