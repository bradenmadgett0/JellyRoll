/**
 * Server Store — Zustand + expo-secure-store
 * Manages server configurations with encrypted credential persistence
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { ServerConfig, ServerType } from '../../types/server';

const SERVERS_KEY = 'jellyroll_servers';

interface ServerState {
    servers: ServerConfig[];
    isLoaded: boolean;

    // Actions
    loadServers: () => Promise<void>;
    addServer: (server: Omit<ServerConfig, 'id' | 'sortOrder'>) => Promise<string>;
    updateServer: (id: string, updates: Partial<ServerConfig>) => Promise<void>;
    removeServer: (id: string) => Promise<void>;
    getServersByType: (type: ServerType) => ServerConfig[];
    getServer: (id: string) => ServerConfig | undefined;
    reorderServers: (ids: string[]) => Promise<void>;
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

async function saveToSecureStore(servers: ServerConfig[]): Promise<void> {
    try {
        const serialized = JSON.stringify(servers);
        if (Platform.OS === 'web') {
            // Fallback for web — localStorage (less secure, for dev only)
            localStorage.setItem(SERVERS_KEY, serialized);
        } else {
            await SecureStore.setItemAsync(SERVERS_KEY, serialized);
        }
    } catch (error) {
        console.error('Failed to save servers:', error);
        throw new Error('Failed to save server configuration securely.');
    }
}

async function loadFromSecureStore(): Promise<ServerConfig[]> {
    try {
        let serialized: string | null = null;
        if (Platform.OS === 'web') {
            serialized = localStorage.getItem(SERVERS_KEY);
        } else {
            serialized = await SecureStore.getItemAsync(SERVERS_KEY);
        }
        if (serialized) {
            return JSON.parse(serialized) as ServerConfig[];
        }
        return [];
    } catch (error) {
        console.error('Failed to load servers:', error);
        return [];
    }
}

export const useServerStore = create<ServerState>((set, get) => ({
    servers: [],
    isLoaded: false,

    loadServers: async () => {
        const servers = await loadFromSecureStore();
        set({ servers, isLoaded: true });
    },

    addServer: async (serverData) => {
        const id = generateId();
        const newServer: ServerConfig = {
            ...serverData,
            id,
            sortOrder: get().servers.length,
        };
        const updated = [...get().servers, newServer];
        await saveToSecureStore(updated);
        set({ servers: updated });
        return id;
    },

    updateServer: async (id, updates) => {
        const updated = get().servers.map((s) =>
            s.id === id ? { ...s, ...updates } : s
        );
        await saveToSecureStore(updated);
        set({ servers: updated });
    },

    removeServer: async (id) => {
        const updated = get().servers.filter((s) => s.id !== id);
        await saveToSecureStore(updated);
        set({ servers: updated });
    },

    getServersByType: (type) => {
        return get().servers.filter((s) => s.type === type);
    },

    getServer: (id) => {
        return get().servers.find((s) => s.id === id);
    },

    reorderServers: async (ids) => {
        const servers = get().servers;
        const reordered = ids
            .map((id, index) => {
                const server = servers.find((s) => s.id === id);
                return server ? { ...server, sortOrder: index } : null;
            })
            .filter(Boolean) as ServerConfig[];
        await saveToSecureStore(reordered);
        set({ servers: reordered });
    },
}));
