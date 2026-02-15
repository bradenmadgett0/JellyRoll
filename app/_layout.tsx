/**
 * JellyRoll Root Layout
 * Wraps app with providers: React Query, Theme, Server Loading
 */

import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { Colors } from '../constants/Colors';
import { useServerStore } from '../services/stores/serverStore';

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

// Custom dark theme matching our design system
const JellyRollDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.backgroundSecondary,
    text: Colors.text,
    border: Colors.surfaceBorder,
    notification: Colors.accent,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const loadServers = useServerStore((s) => s.loadServers);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function init() {
      await loadServers();
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, [fontsLoaded, loadServers]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={JellyRollDarkTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.backgroundSecondary },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="server/add"
            options={{
              presentation: 'modal',
              title: 'Add Server',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="server/[id]"
            options={{
              presentation: 'modal',
              title: 'Server Details',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="media/[id]"
            options={{
              title: '',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="media/player"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="sonarr/index"
            options={{
              title: 'Sonarr',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="sonarr/[id]"
            options={{
              title: 'Series',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="radarr/index"
            options={{
              title: 'Radarr',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="radarr/[id]"
            options={{
              title: 'Movie',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="lidarr/index"
            options={{
              title: 'Lidarr',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="lidarr/[id]"
            options={{
              title: 'Artist',
              headerShown: true,
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
