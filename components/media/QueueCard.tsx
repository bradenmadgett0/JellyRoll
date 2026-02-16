/**
 * QueueCard — Download progress card for queue items
 */

import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SOURCE_COLORS, SOURCE_ICONS } from "../../constants/Sources";
import { Spacing } from "../../constants/Spacing";
import { AppColors, useColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";

interface QueueCardProps {
  title: string;
  /** e.g. "S01E05" or "Movie (2024)" */
  subtitle?: string;
  status: string;
  progress: number;
  size?: string;
  timeLeft?: string;
  quality?: string;
  /** sonarr, radarr, lidarr */
  source?: "sonarr" | "radarr" | "lidarr";
}

function getStatusColor(status: string, colors: AppColors): string {
  switch (status.toLowerCase()) {
    case "downloading":
      return colors.badgeDownloading;
    case "completed":
    case "imported":
      return colors.success;
    case "failed":
    case "warning":
      return colors.error;
    case "paused":
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}

function QueueCardBase({
  title,
  subtitle,
  status,
  progress,
  size,
  timeLeft,
  quality,
  source,
}: QueueCardProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const sourceColor = source
    ? SOURCE_COLORS[source]
    : (styles.primaryColor.color as string);
  const statusColor = getStatusColor(status, colors);

  return (
    <View style={[styles.container, { borderLeftColor: sourceColor }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {source && (
            <Ionicons
              name={SOURCE_ICONS[source]}
              size={14}
              color={sourceColor}
              style={{ marginRight: 6 }}
            />
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status}
          </Text>
        </View>
      </View>

      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: sourceColor,
            },
          ]}
        />
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>{Math.round(progress)}%</Text>
        {size && <Text style={styles.infoText}>{size}</Text>}
        {quality && <Text style={styles.infoText}>{quality}</Text>}
        {timeLeft && (
          <Text style={styles.infoText}>
            <Ionicons
              name="time-outline"
              size={10}
              color={styles.iconTertiary.color}
            />{" "}
            {timeLeft}
          </Text>
        )}
      </View>
    </View>
  );
}

export const QueueCard = memo(QueueCardBase);

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.backgroundTertiary,
      borderRadius: Spacing.radiusMd,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderLeftWidth: 3,
      marginBottom: Spacing.sm,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: Spacing.sm,
    },
    title: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Spacing.radiusSm,
    },
    statusText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    subtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
    },
    progressContainer: {
      height: 4,
      backgroundColor: colors.surfaceBorder,
      borderRadius: 2,
      marginBottom: Spacing.sm,
      overflow: "hidden",
    },
    progressBar: {
      height: "100%",
      borderRadius: 2,
    },
    infoRow: {
      flexDirection: "row",
      gap: Spacing.lg,
    },
    infoText: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: colors.textTertiary,
    },

    // Color tokens for inline use
    primaryColor: { color: colors.primary },
    iconTertiary: { color: colors.textTertiary },
  });
