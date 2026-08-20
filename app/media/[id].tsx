/**
 * Media Detail Screen — Full media info with hero backdrop, metadata, cast, play button
 */

import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { EpisodeDetail } from "../../components/media/detail/EpisodeDetail";
import { GenericDetail } from "../../components/media/detail/GenericDetail";
import { MediaHero } from "../../components/media/detail/MediaHero";
import { MovieDetail } from "../../components/media/detail/MovieDetail";
import { SeriesDetail } from "../../components/media/detail/SeriesDetail";
import { Spacing } from "../../constants/Spacing";
import { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useJellyfinDetail } from "../../services/hooks/useJellyfin";
import { JellyfinItem } from "../../types/jellyfin";

function MediaDetailBody({ item }: { item: JellyfinItem }) {
  switch (item.Type) {
    case "Series":
      return <SeriesDetail item={item} />;
    case "Episode":
      return <EpisodeDetail item={item} />;
    case "Movie":
      return <MovieDetail item={item} />;
    default:
      return <GenericDetail item={item} />;
  }
}

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  const { data: item, isLoading, error } = useJellyfinDetail(id);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator
          size="large"
          color={styles.iconPrimary.color as string}
        />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Error" }} />
        <Ionicons
          name="alert-circle"
          size={48}
          color={styles.iconError.color}
        />
        <Text style={styles.errorText}>Failed to load media</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        bounces={true}
      >
        <MediaHero item={item} onBack={() => router.back()} />

        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={styles.contentOverlay}
        >
          <MediaDetailBody item={item} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    contentContainer: { paddingBottom: 40 },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      gap: Spacing.md,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
    },
    errorText: {
      color: colors.error,
      fontSize: 16,
      fontFamily: "Inter_500Medium",
      marginTop: Spacing.sm,
    },
    backBtn: {
      marginTop: Spacing.lg,
      backgroundColor: colors.backgroundTertiary,
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.md,
      borderRadius: Spacing.radiusMd,
    },
    backBtnText: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    contentOverlay: {
      paddingHorizontal: Spacing.screenPadding,
      marginTop: -60,
    },

    // Color tokens for inline use
    iconPrimary: { color: colors.primary },
    iconError: { color: colors.error },
  });
