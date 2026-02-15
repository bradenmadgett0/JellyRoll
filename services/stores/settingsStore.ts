/**
 * Settings Store — App-level preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

type Theme = 'dark' | 'light' | 'system';
type MediaView = 'grid' | 'list';

interface SettingsState {
    theme: Theme;
    mediaViewMode: MediaView;
    isLoaded: boolean;

    loadSettings: () => Promise<void>;
    setTheme: (theme: Theme) => Promise<void>;
    setMediaViewMode: (mode: MediaView) => Promise<void>;
}

const SETTINGS_KEY = 'jellyroll_settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
    theme: 'dark',
    mediaViewMode: 'grid',
    isLoaded: false,

    loadSettings: async () => {
        try {
            const raw = await AsyncStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                set({
                    theme: saved.theme ?? 'dark',
                    mediaViewMode: saved.mediaViewMode ?? 'grid',
                    isLoaded: true,
                });
            } else {
                set({ isLoaded: true });
            }
        } catch {
            set({ isLoaded: true });
        }
    },

    setTheme: async (theme) => {
        set({ theme });
        const state = get();
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
            theme: state.theme,
            mediaViewMode: state.mediaViewMode,
        }));
    },

    setMediaViewMode: async (mode) => {
        set({ mediaViewMode: mode });
        const state = get();
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
            theme: state.theme,
            mediaViewMode: state.mediaViewMode,
        }));
    },
}));
