import { AppColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeTokens } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { iso6392 } from "iso-639-2";
import { JSX, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { JellyfinItem, JellyfinMediaStream } from "../../types/jellyfin";
import MediaObjectListModal from "../ui/MediaObjectListModal";

// Full ISO 639-2 code → English name table from the `iso-639-2` package
// (canonical data, not hand-typed from memory) keyed by both bibliographic
// and terminology codes — Jellyfin/ffprobe metadata uses either depending
// on the source. Some official names list alternates ("Dutch; Flemish");
// only the first is kept, since the button is meant to be a quick glance.
const LANGUAGE_NAMES: Record<string, string> = {};
for (const lang of iso6392) {
  const name = lang.name.split(";")[0].trim();
  LANGUAGE_NAMES[lang.iso6392B] = name;
  if (lang.iso6392T) LANGUAGE_NAMES[lang.iso6392T] = name;
}

/**
 * Just the language ("English"), not the full DisplayTitle Jellyfin builds
 * — that varies in structure depending on whether the stream has a custom
 * embedded Title. Confirmed live against a real server: when a stream has
 * one (e.g. "Dolby TrueHD.7.1 with Dolby Atmos"), Jellyfin puts *that*
 * first in DisplayTitle, then the language ("... - English - ..."); only
 * without a Title does DisplayTitle start with the language itself. So
 * "take DisplayTitle's first segment" (a previous approach here) picks up
 * the embedded title instead of the language whenever one exists — a real,
 * confirmed bug, not a hypothetical one.
 *
 * `Language` itself (an ISO 639 code) doesn't have this problem — it was
 * "eng"/"ita"/"fra"/"spa" correctly in every real stream checked, embedded
 * title or not. No Intl.DisplayNames fallback: it can't cover anything
 * LANGUAGE_NAMES doesn't already (Jellyfin's codes are ISO 639-2, and the
 * table above is the complete standard), and it silently produced no
 * usable result on the one real device this was tested on.
 */
function languageLabel(stream: JellyfinMediaStream | undefined): string {
  if (!stream) return "Audio";
  const code = stream.Language;
  if (code && LANGUAGE_NAMES[code]) return LANGUAGE_NAMES[code];
  return code || "Audio";
}

interface AudioStreamSelectorProps {
  item: JellyfinItem | null | undefined;
  selectedAudioIndex: number | undefined;
  onAudioStreamChange?: (index: number) => void;
  onModalToggle: (modal?: JSX.Element) => void;
}

const AudioStreamSelector = ({
  item,
  selectedAudioIndex,
  onAudioStreamChange,
  onModalToggle,
}: AudioStreamSelectorProps) => {
  const theme = useTheme();
  const themedStyles = useThemedStyles(styles);

  const audioStreams = useMemo(() => {
    if (!item?.MediaSources?.[0]?.MediaStreams) return [];
    return item.MediaSources[0].MediaStreams.filter((s) => s.Type === "Audio");
  }, [item]);

  const audioLanguageModal = useMemo(
    () => (
      <MediaObjectListModal
        onModalToggle={() => onModalToggle(undefined)}
        title="Audio Language"
        options={audioStreams.map((s) => ({
          ...s,
          label: s.DisplayTitle || "",
        }))}
        onOptionSelect={(option) => {
          onAudioStreamChange?.(option.Index);
          onModalToggle(undefined);
        }}
        initialSelectedIndex={audioStreams?.findIndex(
          (s) => s.Index === selectedAudioIndex,
        )}
      />
    ),
    [audioStreams, selectedAudioIndex, onAudioStreamChange, onModalToggle],
  );

  if (!item) {
    return null;
  }

  const selectedStream = audioStreams.find(
    (s) => s.Index === selectedAudioIndex,
  );
  const label = languageLabel(selectedStream);

  return (
    <View>
      <TouchableOpacity
        onPress={() => onModalToggle?.(audioLanguageModal)}
        style={themedStyles.qualityBtn}
        hitSlop={12}
      >
        <Ionicons
          name="language-outline"
          size={18}
          color={theme.overlay.icon}
        />
        <Text style={themedStyles.qualityBtnLabel}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AudioStreamSelector;

// ─── Styles ─────────────────────────────────────────────────
const styles = (colors: AppColors, theme: ThemeTokens) =>
  StyleSheet.create({
    // Bottom bar
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

    // Quality picker modal
    pickerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.overlay.backdrop,
      justifyContent: "center",
      alignItems: "center",
      position: "absolute",
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
