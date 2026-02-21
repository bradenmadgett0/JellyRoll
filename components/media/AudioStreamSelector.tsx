import { AppColors } from "@/hooks/useColors";
import { useMediaSettings } from "@/services/hooks/useMediaSettings";
import { Ionicons } from "@expo/vector-icons";
import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { JellyfinItem } from "../../types/jellyfin";
import MediaObjectListModal from "../ui/MediaObjectListModal";

interface AudioStreamSelectorProps {
  item: JellyfinItem | null | undefined;
  onAudioStreamChange?: (index: number) => void;
  onModalToggle: (modal?: JSX.Element) => void;
}

const AudioStreamSelector = ({
  item,
  onAudioStreamChange,
  onModalToggle,
}: AudioStreamSelectorProps) => {
  if (!item) {
    return null;
  }

  const themedStyles = useThemedStyles(styles);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);
  const { get: getMediaSettings, set: setMediaSettings } = useMediaSettings(
    item.Id,
  );
  const hasInitialized = useRef(false);

  const audioStreams = useMemo(() => {
    if (!item?.MediaSources?.[0]?.MediaStreams) return [];
    return item.MediaSources[0].MediaStreams.filter((s) => s.Type === "Audio");
  }, [item]);

  useEffect(() => {
    if (hasInitialized.current) return;
    const saved = getMediaSettings();
    if (saved) {
      hasInitialized.current = true;
      if (saved.audioStreamIndex !== undefined) {
        setSelectedAudioIndex(saved.audioStreamIndex);
        return;
      }
    }
    // Fall back to default audio stream if no saved setting
    const defaultStream = audioStreams.find((s) => s.IsDefault);
    if (defaultStream) {
      setSelectedAudioIndex(defaultStream.Index);
    } else if (audioStreams.length > 0) {
      setSelectedAudioIndex(audioStreams[0].Index);
    }
  }, [audioStreams, getMediaSettings]);

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
          setSelectedAudioIndex(option.Index);
          setMediaSettings({ audioStreamIndex: option.Index });
          onAudioStreamChange?.(option.Index);
          onModalToggle(undefined);
        }}
        initialSelectedIndex={audioStreams?.findIndex(
          (s) => s.Index === selectedAudioIndex,
        )}
      />
    ),
    [audioStreams, selectedAudioIndex, onAudioStreamChange],
  );

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
          color="rgba(255,255,255,0.8)"
        />
        <Text style={themedStyles.qualityBtnLabel}>
          {audioStreams?.[selectedAudioIndex - 1 || 0]?.Language}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default AudioStreamSelector;

// ─── Styles ─────────────────────────────────────────────────
const styles = (colors: AppColors) =>
  StyleSheet.create({
    // Bottom bar
    qualityBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    qualityBtnLabel: {
      fontFamily: "Inter_500Medium",
      fontSize: 11,
      color: "rgba(255,255,255,0.85)",
    },

    // Quality picker modal
    pickerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      position: "absolute",
      zIndex: 20,
    },
    pickerContainer: {
      backgroundColor: "rgba(30,30,30,0.95)",
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 8,
      minWidth: 240,
      maxWidth: 300,
    },
    pickerTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: "#fff",
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
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    pickerOptionText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: "rgba(255,255,255,0.7)",
    },
    pickerOptionTextActive: {
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
  });
