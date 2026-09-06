/**
 * Tab bar layout — JellyRoll main navigation
 * Premium glassmorphic tab bar with blur effect
 */

import { Ionicons } from "@expo/vector-icons";
import type { ThemeTokens } from "@/constants/theme";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { AppColors } from "../../hooks/useColors";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useLidarrQueue } from "../../services/hooks/useLidarr";
import { useRadarrQueue } from "../../services/hooks/useRadarr";
import { useSonarrQueue } from "../../services/hooks/useSonarr";
import { useServerStore } from "../../services/stores/serverStore";

const ICON_SIZE = 18;

export default function TabLayout() {
  const styles = useThemedStyles(createStyles);
  const servers = useServerStore((s) => s.servers);
  const hasArr = servers.some((s) => s.type !== "jellyfin");

  const { data: sonarrQ } = useSonarrQueue();
  const { data: radarrQ } = useRadarrQueue();
  const { data: lidarrQ } = useLidarrQueue();

  const totalQueue =
    (sonarrQ?.totalRecords ?? 0) +
    (radarrQ?.totalRecords ?? 0) +
    (lidarrQ?.totalRecords ?? 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: styles.tabBarActive.color,
        tabBarInactiveTintColor: styles.tabBarInactive.color,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTintColor: styles.headerTitle.color,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        tabBarBackground: () =>
            <BlurView
              intensity={Platform.OS === "ios" ? 60 : 100}
              tint="dark"
              style={[StyleSheet.absoluteFill, styles.tabBarBgLayout]}
            />
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: "Manage",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? "layers" : "layers-outline"}
                size={ICON_SIZE}
                color={color}
              />
              {totalQueue > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {totalQueue > 99 ? "99+" : totalQueue}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const createStyles = (colors: AppColors, theme: ThemeTokens) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: "transparent",
      borderTopColor: colors.glassBorder,
      borderTopWidth: 0.5,
      paddingTop: 4,
      height: 64,
      position: "absolute",
      marginBottom: 24,
      marginHorizontal: 24
    },
    tabBarLabel: {
      ...theme.text("labelSmall", "medium"),
      marginBottom: Platform.OS === "ios" ? 0 : 8,
      backgroundColor: 'transparent'
    },
    tabBarBgLayout: {
      borderRadius: 30,
      overflow: 'hidden',
    },
    tabBarBg: { backgroundColor: colors.backgroundSecondary },
    tabBarActive: { color: colors.text },
    tabBarInactive: { color: colors.textSecondary },
    header: {
      backgroundColor: colors.background,
    },
    headerTitle: {
      ...theme.text("h3", "bold"),
      color: colors.text,
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -10,
      backgroundColor: colors.accent,
      borderRadius: 9,
      minWidth: 18,
      height: 18,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
    },
    badgeText: {
      ...theme.text("micro", "semibold"),
      color: "#FFFFFF",
    },
  });
