import { AppColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  const themedStyles = useThemedStyles(styles);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);

  return (
    <TouchableOpacity
      style={themedStyles.pickerBackdrop}
      onPress={onModalToggle}
    >
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
              onPress={() => onOptionSelect(option)}
            >
              <Text
                style={[
                  themedStyles.pickerOptionText,
                  isActive && themedStyles.pickerOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
              {isActive && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
          );
        })}
      </View>
    </TouchableOpacity>
  );
};

export default MediaObjectListModal;

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
