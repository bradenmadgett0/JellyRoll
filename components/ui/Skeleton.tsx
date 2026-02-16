/**
 * Skeleton — Shimmer-animated loading placeholders
 */

import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Spacing } from "../../constants/Spacing";
import { useColors } from "../../hooks/useColors";

// ─── Shimmer Wrapper ─────────────────────────────

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Shimmer({
  width,
  height,
  borderRadius = 6,
  style,
}: ShimmerProps) {
  const colors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.backgroundTertiary,
          overflow: "hidden",
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ─── Skeleton Primitives ────────────────────────────

interface SkeletonBoxProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({
  width,
  height,
  borderRadius = 6,
  style,
}: SkeletonBoxProps) {
  return (
    <Shimmer
      width={width}
      height={height}
      borderRadius={borderRadius}
      style={style}
    />
  );
}

interface SkeletonTextProps {
  width?: number | string;
  lines?: number;
  lineHeight?: number;
  gap?: number;
  style?: ViewStyle;
}

export function SkeletonText({
  width = "100%",
  lines = 1,
  lineHeight = 14,
  gap = 8,
  style,
}: SkeletonTextProps) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          width={i === lines - 1 && lines > 1 ? "60%" : width}
          height={lineHeight}
          borderRadius={4}
        />
      ))}
    </View>
  );
}

// ─── Media Skeletons ────────────────────────────────

export function SkeletonCard({
  variant = "poster",
}: {
  variant?: "poster" | "backdrop";
}) {
  const isPoster = variant === "poster";
  const width = isPoster ? Spacing.posterWidth : 280;
  const height = isPoster ? Spacing.posterHeight : Spacing.backdropHeight;

  return (
    <View style={{ width, gap: 8 }}>
      <Shimmer width={width} height={height} borderRadius={Spacing.radiusMd} />
      <SkeletonText width="80%" lineHeight={12} />
      <SkeletonText width="50%" lineHeight={10} />
    </View>
  );
}

export function SkeletonRow({
  variant = "poster",
  count = 4,
}: {
  variant?: "poster" | "backdrop";
  count?: number;
}) {
  return (
    <View style={styles.rowContainer}>
      <View style={styles.rowHeader}>
        <Shimmer width={140} height={20} borderRadius={4} />
      </View>
      <View style={styles.rowContent}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} variant={variant} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonListItem() {
  return (
    <View style={styles.listItem}>
      <Shimmer width={56} height={84} borderRadius={Spacing.radiusSm} />
      <View style={styles.listItemContent}>
        <SkeletonText width="70%" lineHeight={14} />
        <SkeletonText width="50%" lineHeight={12} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Shimmer width={60} height={16} borderRadius={4} />
          <Shimmer width={50} height={16} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonGrid({
  columns = 3,
  rows = 3,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: columns * rows }).map((_, i) => (
        <View key={i} style={styles.gridItem}>
          <Shimmer width="100%" height={160} borderRadius={Spacing.radiusMd} />
          <SkeletonText width="80%" lineHeight={12} style={{ marginTop: 6 }} />
          <SkeletonText width="40%" lineHeight={10} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    marginTop: Spacing.xl,
  },
  rowHeader: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  rowContent: {
    flexDirection: "row",
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.md,
  },
  listItem: {
    flexDirection: "row",
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    alignItems: "center",
  },
  listItemContent: {
    flex: 1,
    gap: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.md,
  },
  gridItem: {
    width: "30%",
    gap: 4,
  },
});
