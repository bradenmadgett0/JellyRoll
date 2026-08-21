/**
 * PlayerOverlay — Full custom video control overlay.
 *
 * Top bar:    Back button  ·  Title  ·  AirPlay
 * Center:    Skip -10s  ·  Play/Pause  ·  Skip +10s
 * Bottom:    Elapsed  ·  Scrubber  ·  Remaining  ·  Fullscreen
 */

import AudioStreamSelector from "@/components/media/AudioStreamSelector";
import type { ThemeTokens } from "@/constants/theme";
import type { AppColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Ionicons } from "@expo/vector-icons";
import { useEventListener } from "expo";
import { useRouter } from "expo-router";
import { VideoAirPlayButton, VideoPlayer } from "expo-video";
import React, {
  JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Spacing } from "../../constants/Spacing";
import { JellyfinItem } from "../../types/jellyfin";
import {
  formatBitrate,
  QualityPreset,
} from "../../types/player";

// ─── Time formatting ────────────────────────────────────────
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Props ──────────────────────────────────────────────────
interface PlayerOverlayProps {
  player: VideoPlayer;
  item?: JellyfinItem | null;
  itemId: string;
  showOverlay: boolean;
  hideOverlay: () => void;
  qualityPresets: QualityPreset[];
  selectedQuality: QualityPreset;
  onQualityChange: (preset: QualityPreset) => void;
  selectedAudioStreamIndex: number | undefined;
  onAudioStreamChange: (streamIndex: number) => void;
}

const AUTO_HIDE_MS = 4000;

export default function PlayerOverlay({
  player,
  item,
  itemId,
  hideOverlay,
  qualityPresets,
  selectedQuality,
  onQualityChange,
  showOverlay,
  selectedAudioStreamIndex,
  onAudioStreamChange,
}: PlayerOverlayProps) {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const [isPlaying, setIsPlaying] = useState(player.playing);
  const [currentTime, setCurrentTime] = useState(player.currentTime);
  const [duration, setDuration] = useState(player.duration);
  const [bitrate, setBitrate] = useState<number | null>(
    player.videoTrack?.bitrate ?? null,
  );
  const [showQualityPicker, setShowQualityPicker] = useState(false);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubberWidth, setScrubberWidth] = useState(0);
  const [overlayModalContent, setOverlayModalContent] = useState<JSX.Element>();

  const scrubRef = useRef(currentTime);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Player state, event-driven ──────────────────────────
  // Replaces a 500ms poll (that raced player teardown, hence the try/catch
  // it used to need — events simply don't fire on a released player).
  // player.timeUpdateEventInterval is set once in player.tsx.
  useEventListener(player, "playingChange", ({ isPlaying: playing }) => {
    setIsPlaying(playing);
  });

  useEventListener(player, "timeUpdate", ({ currentTime: time }) => {
    if (!isScrubbing) setCurrentTime(time);
  });

  useEventListener(player, "sourceLoad", ({ duration: loadedDuration }) => {
    setDuration(loadedDuration);
  });

  useEventListener(player, "videoTrackChange", ({ videoTrack }) => {
    setBitrate(videoTrack?.bitrate ?? null);
  });

  const setAutoHideTimer = useCallback(() => {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    autoHideTimer.current = setTimeout(() => {
      hideOverlay();
    }, AUTO_HIDE_MS);
  }, [hideOverlay]);

  // ─── Auto-hide overlay ──────────────────────────────────
  useEffect(() => {
    if (
      showOverlay &&
      !isScrubbing &&
      !showQualityPicker &&
      !overlayModalContent
    ) {
      setAutoHideTimer();
      return () => {
        if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
      };
    }
  }, [
    showOverlay,
    isScrubbing,
    showQualityPicker,
    overlayModalContent,
    setAutoHideTimer,
  ]);

  // ─── Controls ───────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    // isPlaying is owned by the playingChange event now — don't read
    // player.playing back immediately after calling play()/pause(), it may
    // not have flipped yet.
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const handleSkipBack = useCallback(() => {
    player.seekBy(-10);
  }, [player]);

  const handleSkipForward = useCallback(() => {
    player.seekBy(10);
  }, [player]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // ─── Scrubber touch handling ────────────────────────────
  const handleScrubberLayout = useCallback((e: LayoutChangeEvent) => {
    setScrubberWidth(e.nativeEvent.layout.width);
  }, []);

  const seekToPosition = useCallback(
    (pageX: number, trackX: number) => {
      if (scrubberWidth <= 0 || duration <= 0) return;
      const offsetX = pageX - trackX;
      const pct = Math.max(0, Math.min(1, offsetX / scrubberWidth));
      const seekTime = pct * duration;
      scrubRef.current = seekTime;
      setCurrentTime(seekTime);
    },
    [scrubberWidth, duration],
  );

  const scrubberTrackRef = useRef<View>(null);
  const trackXRef = useRef(0);

  const handleScrubStart = useCallback(
    (e: GestureResponderEvent) => {
      setIsScrubbing(true);
      // Reset auto-hide
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
      // Measure the track position once
      scrubberTrackRef.current?.measureInWindow((x) => {
        trackXRef.current = x;
        seekToPosition(e.nativeEvent.pageX, x);
      });
    },
    [seekToPosition],
  );

  const handleScrubMove = useCallback(
    (e: GestureResponderEvent) => {
      seekToPosition(e.nativeEvent.pageX, trackXRef.current);
    },
    [seekToPosition],
  );

  const handleScrubEnd = useCallback(() => {
    player.currentTime = scrubRef.current;
    setIsScrubbing(false);
  }, [player]);

  // ─── Derived values ─────────────────────────────────────
  const progress = duration > 0 ? currentTime / duration : 0;
  const remaining = duration - currentTime;

  const parentGesture = useMemo(
    () =>
      Gesture.Tap()
        .onStart(() => {
          setAutoHideTimer();
        })
        .runOnJS(true),
    [setAutoHideTimer],
  );

  if (!showOverlay) return null;

  return (
    <GestureDetector gesture={parentGesture}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
        pointerEvents="box-none"
      >
        {overlayModalContent && (
          <View style={styles.modalOverlayContainer}>
            {overlayModalContent}
          </View>
        )}
        {/* Gradient scrim */}
        <View style={styles.scrimTop} />
        <View style={styles.scrimBottom} />

        {/* ─── Top Bar ─────────────────────────────────── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.controlBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={24} color={theme.overlay.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {item?.Name ?? "Playing..."}
            </Text>
            {item?.Type === "Episode" && item.SeriesName && (
              <Text style={styles.subtitle}>
                {item.SeriesName} · S{item.ParentIndexNumber}E{item.IndexNumber}
              </Text>
            )}
          </View>

          {/* Mirrors controlBtn's fixed size on the other side so the row's
              two flex-1 title margins stay equal — without this, the title
              (centered only within its own flex-1 slot) sits visibly off
              true center: on Android there's nothing here at all to balance
              the back button, and even on iOS VideoAirPlayButton's native
              size isn't guaranteed to match controlBtn's. */}
          <View style={styles.controlBtn}>
            {Platform.OS === "ios" && <VideoAirPlayButton />}
          </View>
        </View>

        {/* ─── Center Controls ─────────────────────────── */}
        <View style={styles.centerControls}>
          <TouchableOpacity
            onPress={handleSkipBack}
            style={styles.skipBtn}
            hitSlop={16}
          >
            <Ionicons name="play-back" size={28} color={theme.overlay.text} />
            <Text style={styles.skipLabel}>10</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePlayPause}
            style={styles.playPauseBtn}
            hitSlop={16}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={38}
              color={theme.overlay.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkipForward}
            style={styles.skipBtn}
            hitSlop={16}
          >
            <Ionicons name="play-forward" size={28} color={theme.overlay.text} />
            <Text style={styles.skipLabel}>10</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Bottom Bar ──────────────────────────────── */}
        <View style={styles.bottomBar}>
          {/* Time labels + scrubber */}
          <View style={styles.scrubberRow}>
            <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>

            <View
              ref={scrubberTrackRef}
              style={styles.scrubberTrack}
              onLayout={handleScrubberLayout}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleScrubStart}
              onResponderMove={handleScrubMove}
              onResponderRelease={handleScrubEnd}
              onResponderTerminate={handleScrubEnd}
            >
              {/* Progress fill */}
              <View
                style={[styles.scrubberFill, { width: `${progress * 100}%` }]}
              />
              {/* Thumb */}
              <View
                style={[styles.scrubberThumb, { left: `${progress * 100}%` }]}
              />
            </View>

            <Text style={styles.timeLabel}>-{formatTime(remaining)}</Text>
          </View>

          {/* Bitrate indicator + quality gear */}
          <View style={styles.bottomMeta}>
            {formatBitrate(bitrate) && (
              <Text style={styles.bitrateLabel}>{formatBitrate(bitrate)}</Text>
            )}
            <TouchableOpacity
              onPress={() => setShowQualityPicker(true)}
              style={styles.qualityBtn}
              hitSlop={12}
            >
              <Ionicons
                name="settings-sharp"
                size={18}
                color={theme.overlay.icon}
              />
              <Text style={styles.qualityBtnLabel}>
                {selectedQuality.label}
              </Text>
            </TouchableOpacity>

            <AudioStreamSelector
              item={item}
              selectedAudioIndex={selectedAudioStreamIndex}
              onAudioStreamChange={onAudioStreamChange}
              onModalToggle={(modal) =>
                overlayModalContent
                  ? setOverlayModalContent(undefined)
                  : setOverlayModalContent(modal)
              }
            />
          </View>
        </View>

        {/* ─── Quality Picker Modal ────────────────────── */}
        {showQualityPicker && (
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowQualityPicker(false)}
          >
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Stream Quality</Text>
              {qualityPresets.map((preset) => {
                const isActive = preset.label === selectedQuality.label;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.pickerOption,
                      isActive && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      onQualityChange(preset);
                      setShowQualityPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isActive && styles.pickerOptionTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={18} color={theme.overlay.text} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Styles ─────────────────────────────────────────────────
// The player chrome sits over video, so it draws entirely from the fixed
// overlay tokens rather than the themed palette — hence the unused `colors`.
const createStyles = (_colors: AppColors, theme: ThemeTokens) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "space-between",
      zIndex: 10,
    },

    // Gradient scrims
    scrimTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 120,
      backgroundColor: "transparent",
      // Simulated gradient via opacity
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
    scrimBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 140,
      backgroundColor: theme.overlay.scrimBottom,
    },

    // Top bar
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 54,
      paddingHorizontal: Spacing.screenPadding,
      paddingBottom: Spacing.md,
      backgroundColor: theme.overlay.scrimTop,
    },
    controlBtn: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    titleContainer: {
      flex: 1,
      marginHorizontal: Spacing.sm,
      alignItems: "center",
    },
    title: {
      ...theme.text("body", "semibold"),
      color: theme.overlay.text,
      textAlign: "center",
    },
    subtitle: {
      ...theme.text("label", "regular"),
      color: theme.overlay.textSecondary,
      marginTop: 2,
      textAlign: "center",
    },

    // Center controls
    centerControls: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 48,
    },
    skipBtn: {
      alignItems: "center",
      justifyContent: "center",
      width: 56,
      height: 56,
    },
    skipLabel: {
      ...theme.text("micro", "semibold"),
      color: theme.overlay.icon,
      marginTop: -4,
    },
    playPauseBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.overlay.controlActive,
      justifyContent: "center",
      alignItems: "center",
    },

    // Bottom bar
    bottomBar: {
      paddingHorizontal: Spacing.screenPadding,
      paddingBottom: 40,
    },
    scrubberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    timeLabel: {
      ...theme.text("label", "medium"),
      color: theme.overlay.textMuted,
      minWidth: 45,
      textAlign: "center",
    },
    scrubberTrack: {
      flex: 1,
      height: 32,
      justifyContent: "center",
    },
    scrubberFill: {
      position: "absolute",
      left: 0,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.overlay.text,
    },
    scrubberThumb: {
      position: "absolute",
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.overlay.text,
      marginLeft: -7,
      top: 9,
      elevation: 3,
      shadowColor: theme.overlay.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
    },
    bitrateLabel: {
      ...theme.text("labelSmall", "regular"),
      color: theme.overlay.textFaint,
      textAlign: "right",
      marginTop: 4,
    },
    bottomMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 6,
    },
    qualityBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: theme.overlay.control,
    },
    qualityBtnLabel: {
      ...theme.text("labelSmall", "medium"),
      color: theme.overlay.textMuted,
    },

    modalOverlayContainer: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 20,
      position: "absolute",
    },

    // Quality picker modal
    pickerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.overlay.backdrop,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 20,
    },
    pickerContainer: {
      backgroundColor: theme.overlay.surface,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 8,
      minWidth: 240,
      maxWidth: 300,
    },
    pickerTitle: {
      ...theme.text("body", "semibold"),
      color: theme.overlay.text,
      textAlign: "center",
      marginBottom: 12,
    },
    pickerOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    pickerOptionActive: {
      backgroundColor: theme.overlay.control,
    },
    pickerOptionText: {
      ...theme.text("bodySmall", "regular"),
      color: theme.overlay.textSecondary,
    },
    pickerOptionTextActive: {
      ...theme.text("bodySmall", "semibold"),
      color: theme.overlay.text,
    },
    });
