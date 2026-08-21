import { AppColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeTokens } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface MediaObjectListModalProps<T extends object> {
  onModalToggle: () => void;
  title: string;
  options: ({ label: string } & T)[];
  onOptionSelect: (option: T) => void;
  initialSelectedIndex?: number;
}

const MediaObjectListModal = <T extends object>({
  onModalToggle,
  title,
  options,
  initialSelectedIndex = 0,
  onOptionSelect,
}: MediaObjectListModalProps<T>) => {
  const theme = useTheme();
  const themedStyles = useThemedStyles(styles);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);

  return (
    <TouchableWithoutFeedback onPress={onModalToggle}>
      <View style={themedStyles.pickerBackdrop}>
        <View style={themedStyles.pickerContainer}>
          <Text style={themedStyles.pickerTitle}>{title}</Text>
          {options?.map((option, index) => {
            const isActive = index === selectedIndex;
            return (
              <TouchableOpacity
                key={`${title}-${index}`}
                style={[
                  themedStyles.pickerOption,
                  isActive && themedStyles.pickerOptionActive,
                ]}
                onPress={() => {
                  setSelectedIndex(index);
                  onOptionSelect(option);
                }}
              >
                <Text
                  style={[
                    themedStyles.pickerOptionText,
                    isActive && themedStyles.pickerOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark" size={18} color={theme.overlay.text} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default MediaObjectListModal;

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
