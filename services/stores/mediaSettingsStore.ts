/**
 * Media Settings Store — Per-media stream preferences
 * Stores audio, quality, and subtitle settings keyed by serverId:itemId
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'jellyroll_media_settings';

interface MediaStreamSettings {
    audioStreamIndex?: number;
    qualityPreset?: string;
    subtitleStreamIndex?: number;
    showSubtitles?: boolean;
    lastUpdated: string;
}

interface MediaSettingsState {
    settings: Record<string, MediaStreamSettings>;
    isLoaded: boolean;

    loadSettings: () => Promise<void>;
    getSettings: (serverId: string, itemId: string) => MediaStreamSettings | undefined;
    setSettings: (serverId: string, itemId: string, patch: Partial<MediaStreamSettings>) => Promise<void>;
    deleteSettings: (serverId: string, itemId: string) => Promise<void>;
    clearAllSettings: () => Promise<void>;
}

function makeKey(serverId: string, itemId: string): string {
    return `${serverId}:${itemId}`;
}

async function persist(settings: Record<string, MediaStreamSettings>) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const useMediaSettingsStore = create<MediaSettingsState>((set, get) => ({
    settings: {},
    isLoaded: false,

    loadSettings: async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (raw) {
                set({ settings: JSON.parse(raw), isLoaded: true });
            } else {
                set({ isLoaded: true });
            }
        } catch {
            set({ isLoaded: true });
        }
    },

    getSettings: (serverId, itemId) => {
        return get().settings[makeKey(serverId, itemId)];
    },

    setSettings: async (serverId, itemId, patch) => {
        const key = makeKey(serverId, itemId);
        const current = get().settings[key];
        const updated = { ...current, ...patch, lastUpdated: new Date().toISOString() };
        const next = { ...get().settings, [key]: updated };
        set({ settings: next });
        await persist(next);
    },

    deleteSettings: async (serverId, itemId) => {
        const key = makeKey(serverId, itemId);
        const next = { ...get().settings };
        delete next[key];
        set({ settings: next });
        await persist(next);
    },

    clearAllSettings: async () => {
        set({ settings: {} });
        await AsyncStorage.removeItem(STORAGE_KEY);
    },
}));
