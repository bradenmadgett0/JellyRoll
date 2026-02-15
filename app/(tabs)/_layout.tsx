/**
 * Tab bar layout — JellyRoll main navigation
 * Premium glassmorphic tab bar with blur effect
 */

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useLidarrQueue } from '../../services/hooks/useLidarr';
import { useRadarrQueue } from '../../services/hooks/useRadarr';
import { useSonarrQueue } from '../../services/hooks/useSonarr';
import { useServerStore } from '../../services/stores/serverStore';

export default function TabLayout() {
  const servers = useServerStore((s) => s.servers);
  const hasArr = servers.some((s) => s.type !== 'jellyfin');

  const { data: sonarrQ } = useSonarrQueue();
  const { data: radarrQ } = useRadarrQueue();
  const { data: lidarrQ } = useLidarrQueue();

  const totalQueue = (sonarrQ?.totalRecords ?? 0) + (radarrQ?.totalRecords ?? 0) + (lidarrQ?.totalRecords ?? 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTintColor: Colors.text,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.backgroundSecondary }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? 'layers' : 'layers-outline'} size={24} color={color} />
              {totalQueue > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {totalQueue > 99 ? '99+' : totalQueue}
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
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.backgroundSecondary,
    borderTopColor: Colors.glassBorder,
    borderTopWidth: 0.5,
    paddingTop: 4,
    height: Platform.OS === 'ios' ? 88 : 64,
    position: Platform.OS === 'ios' ? 'absolute' : 'relative',
  },
  tabBarLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  header: {
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: Colors.accent,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: '#FFFFFF',
  },
});
