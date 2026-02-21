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
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Themes } from "../constants/Colors";
import { useEffectiveScheme } from "../hooks/useEffectiveScheme";
import { useMediaSettingsStore } from "../services/stores/mediaSettingsStore";
import { useServerStore } from "../services/stores/serverStore";
import { useSettingsStore } from "../services/stores/settingsStore";

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
function buildNavTheme(scheme: "dark" | "light"): Theme {
  const palette = Themes[scheme];
  return {
    dark: scheme === "dark",
    colors: {
      primary: palette.primary,
      background: palette.background,
      card: palette.backgroundSecondary,
      text: palette.text,
      border: palette.surfaceBorder,
      notification: palette.accent,
    },
    fonts: {
      regular: { fontFamily: "Inter_400Regular", fontWeight: "400" },
      medium: { fontFamily: "Inter_500Medium", fontWeight: "500" },
      bold: { fontFamily: "Inter_700Bold", fontWeight: "700" },
      heavy: { fontFamily: "Inter_700Bold", fontWeight: "700" },
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
  const scheme = useEffectiveScheme();
  const navTheme = buildNavTheme(scheme);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function init() {
      await Promise.all([loadServers(), loadSettings(), loadMediaSettings()]);
      if (fontsLoaded) {
        try {
          await SplashScreen.hideAsync();
        } catch {
          // Native splash screen may not be registered (e.g. web, hot reload)
        }
      }
    }
    init();
  }, [fontsLoaded, loadServers, loadSettings, loadMediaSettings]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navTheme}>
        <GestureHandlerRootView>
          <Stack
            screenOptions={{
              headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
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
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
