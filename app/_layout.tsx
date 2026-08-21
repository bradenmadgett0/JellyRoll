/**
 * JellyRoll Root Layout
 * Wraps app with providers: React Query, Theme, Server Loading
 */

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import type { Theme } from "@react-navigation/native";
import { ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { ThemeTokens } from "../constants/theme";
import { useTheme } from "../hooks/useTheme";
import { useMediaSettingsStore } from "../services/stores/mediaSettingsStore";
import { useServerStore } from "../services/stores/serverStore";
import { useSettingsStore } from "../services/stores/settingsStore";
import { useThemeStore } from "../services/stores/themeStore";

// Keep splash visible while loading
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

// Build React Navigation theme entirely from our design tokens
function buildNavTheme(theme: ThemeTokens): Theme {
  const { colors, fonts } = theme;
  return {
    dark: theme.mode === "dark",
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.backgroundSecondary,
      text: colors.text,
      border: colors.surfaceBorder,
      notification: colors.accent,
    },
    fonts: {
      regular: { fontFamily: fonts.regular, fontWeight: "400" },
      medium: { fontFamily: fonts.medium, fontWeight: "500" },
      bold: { fontFamily: fonts.bold, fontWeight: "700" },
      heavy: { fontFamily: fonts.bold, fontWeight: "700" },
    },
  };
}

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const loadServers = useServerStore((s) => s.loadServers);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadMediaSettings = useMediaSettingsStore((s) => s.loadSettings);
  const loadThemes = useThemeStore((s) => s.loadThemes);
  const theme = useTheme();
  const navTheme = useMemo(() => buildNavTheme(theme), [theme]);

  // These registrations must stay in sync with `interFontFamilies` in
  // constants/theme/typography.ts — that's the map the design system hands
  // out, and a family that isn't registered here silently renders as the
  // system font.
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function init() {
      await Promise.all([
        loadServers(),
        loadSettings(),
        loadMediaSettings(),
        loadThemes(),
      ]);
      if (fontsLoaded) {
        try {
          await SplashScreen.hideAsync();
        } catch {
          // Native splash screen may not be registered (e.g. web, hot reload)
        }
      }
    }
    init();
  }, [fontsLoaded, loadServers, loadSettings, loadMediaSettings, loadThemes]);

  // Hide Android's gesture/button nav bar for the whole app, not just the
  // player — Samsung and other Android devices otherwise keep it visible
  // indefinitely. 'overlay-swipe' is the standard "immersive sticky" pattern:
  // a swipe from the bottom temporarily reveals it, then it auto-hides again
  // rather than staying up until dismissed (that's 'inset-swipe' instead).
  // No cleanup/restore — this is the root layout, so there's no "leaving"
  // state to restore to while the app is open. iOS has no such bar, hence
  // the Platform guard.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navTheme}>
        <GestureHandlerRootView>
          <Stack
            screenOptions={{
              headerTitleStyle: { fontFamily: theme.fonts.semibold },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="search"
              options={{
                headerShown: false,
                animation: "fade",
              }}
            />
            <Stack.Screen
              name="server/add"
              options={{
                presentation: "modal",
                title: "Add Server",
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="server/[id]"
              options={{
                presentation: "modal",
                title: "Server Details",
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="media/[id]"
              options={{
                title: "",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="media/player"
              options={{
                headerShown: false,
                presentation: "fullScreenModal",
                animation: "fade",
              }}
            />
            <Stack.Screen
              name="sonarr/index"
              options={{
                title: "Sonarr",
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="sonarr/[id]"
              options={{
                title: "Series",
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="radarr/index"
              options={{
                title: "Radarr",
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="radarr/[id]"
              options={{
                title: "Movie",
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="lidarr/index"
              options={{
                title: "Lidarr",
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="lidarr/[id]"
              options={{
                title: "Artist",
                headerShown: true,
              }}
            />
          </Stack>
          <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
