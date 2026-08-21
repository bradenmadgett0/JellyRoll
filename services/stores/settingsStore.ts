/**
 * Settings Store — App-level preferences.
 *
 * Theme preference lives in `themeStore`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

type MediaView = 'grid' | 'list';
type StreamQuality = 'auto' | '1080p' | '720p' | '480p';

interface SettingsState {
    mediaViewMode: MediaView;
    streamQuality: StreamQuality;
    autoRefreshInterval: number; // seconds, 0 = disabled
    showSubtitles: boolean;
    enableNotifications: boolean;
    isLoaded: boolean;

    loadSettings: () => Promise<void>;
    setMediaViewMode: (mode: MediaView) => Promise<void>;
    setStreamQuality: (quality: StreamQuality) => Promise<void>;
    setAutoRefreshInterval: (interval: number) => Promise<void>;
    setShowSubtitles: (show: boolean) => Promise<void>;
    setEnableNotifications: (enable: boolean) => Promise<void>;
}

const SETTINGS_KEY = 'jellyroll_settings';

function persistState(state: SettingsState) {
    return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
        mediaViewMode: state.mediaViewMode,
        streamQuality: state.streamQuality,
        autoRefreshInterval: state.autoRefreshInterval,
        showSubtitles: state.showSubtitles,
        enableNotifications: state.enableNotifications,
    }));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    mediaViewMode: 'grid',
    streamQuality: 'auto',
    autoRefreshInterval: 30,
    showSubtitles: true,
    enableNotifications: true,
    isLoaded: false,

    loadSettings: async () => {
        try {
            const raw = await AsyncStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                set({
                    mediaViewMode: saved.mediaViewMode ?? 'grid',
                    streamQuality: saved.streamQuality ?? 'auto',
                    autoRefreshInterval: saved.autoRefreshInterval ?? 30,
                    showSubtitles: saved.showSubtitles ?? true,
                    enableNotifications: saved.enableNotifications ?? true,
                    isLoaded: true,
                });
            } else {
                set({ isLoaded: true });
            }
        } catch {
            set({ isLoaded: true });
        }
    },

    setMediaViewMode: async (mode) => {
        set({ mediaViewMode: mode });
        await persistState(get());
    },

    setStreamQuality: async (quality) => {
        set({ streamQuality: quality });
        await persistState(get());
    },

    setAutoRefreshInterval: async (interval) => {
        set({ autoRefreshInterval: interval });
        await persistState(get());
    },

    setShowSubtitles: async (show) => {
        set({ showSubtitles: show });
        await persistState(get());
    },

    setEnableNotifications: async (enable) => {
        set({ enableNotifications: enable });
        await persistState(get());
    },
}));
