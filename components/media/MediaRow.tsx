/**
 * MediaRow — Horizontal scrolling row with section title
 */

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Spacing } from "../../constants/Spacing";
import { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { MediaCard, MediaCardProps } from "./MediaCard";

interface MediaRowProps {
  title: string;
  items: MediaCardProps[];
  onSeeAll?: () => void;
  isLoading?: boolean;
  variant?: "poster" | "backdrop";
  emptyMessage?: string;
}

export function MediaRow({
  title,
  items,
  onSeeAll,
  isLoading = false,
  variant = "poster",
  emptyMessage,
}: MediaRowProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && items.length > 0 && (
          <TouchableOpacity
            onPress={onSeeAll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={styles.iconPrimary.color}
              />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={styles.iconPrimary.color as string}
          />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {emptyMessage || "Nothing here yet"}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map((item) => (
            <MediaCard key={item.id} {...item} variant={variant} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      marginBottom: Spacing.xxl,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.screenPadding,
      marginBottom: Spacing.md,
    },
    title: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 18,
      color: colors.text,
    },
    seeAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    seeAllText: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      color: colors.primary,
    },
    scrollContent: {
      paddingHorizontal: Spacing.screenPadding,
    },
    loadingContainer: {
      height: 180,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      height: 100,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: Spacing.screenPadding,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: Spacing.radiusMd,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    emptyText: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.textTertiary,
    },

    // Color tokens for inline use
    iconPrimary: { color: colors.primary },
  });
