/**
 * Lidarr React Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { ServerConfig } from '../../types/server';
import { LidarrClient } from '../api/lidarr';
import { useServerStore } from '../stores/serverStore';

function createClient(server: ServerConfig): LidarrClient {
    return new LidarrClient(server);
}

function useLidarrServer(): ServerConfig | undefined {
    return useServerStore((s) => s.servers.find((srv) => srv.type === 'lidarr'));
}

// ─── Artists ────────────────────────────────────────

export function useLidarrArtists() {
    const server = useLidarrServer();

    return useQuery({
        queryKey: ['lidarr', 'artists', server?.id],
        queryFn: async () => {
            if (!server) throw new Error('No Lidarr server configured');
            const client = createClient(server);
            return client.getArtists();
        },
        enabled: !!server,
        staleTime: 2 * 60 * 1000,
    });
}

export function useLidarrArtistDetail(id: number | undefined) {
    const server = useLidarrServer();

    return useQuery({
        queryKey: ['lidarr', 'artist', server?.id, id],
        queryFn: async () => {
            if (!server || id === undefined) throw new Error('Missing params');
            const client = createClient(server);
            return client.getArtistDetail(id);
        },
        enabled: !!server && id !== undefined,
        staleTime: 60 * 1000,
    });
}

// ─── Albums ─────────────────────────────────────────

export function useLidarrAlbums(artistId: number | undefined) {
    const server = useLidarrServer();

    return useQuery({
        queryKey: ['lidarr', 'albums', server?.id, artistId],
        queryFn: async () => {
            if (!server || artistId === undefined) throw new Error('Missing params');
            const client = createClient(server);
            return client.getAlbums(artistId);
        },
        enabled: !!server && artistId !== undefined,
        staleTime: 60 * 1000,
    });
}

// ─── Queue ──────────────────────────────────────────

export function useLidarrQueue() {
    const server = useLidarrServer();

    return useQuery({
        queryKey: ['lidarr', 'queue', server?.id],
        queryFn: async () => {
            if (!server) throw new Error('No Lidarr server configured');
            const client = createClient(server);
            return client.getQueue();
        },
        enabled: !!server,
        staleTime: 15 * 1000,
        refetchInterval: 30 * 1000,
    });
}

// ─── Lookup ─────────────────────────────────────────

export function useLidarrLookup(term: string) {
    const server = useLidarrServer();

    return useQuery({
        queryKey: ['lidarr', 'lookup', server?.id, term],
        queryFn: async () => {
            if (!server) throw new Error('No Lidarr server configured');
            const client = createClient(server);
            return client.lookupArtist(term);
        },
        enabled: !!server && term.length >= 2,
        staleTime: 60 * 1000,
    });
}

// ─── Image URL Helper ───────────────────────────────

export function useLidarrImageUrl() {
    const server = useLidarrServer();

    return (artistId: number, coverType: string = 'poster'): string | null => {
        if (!server) return null;
        const client = createClient(server);
        return client.getArtistImageUrl(artistId, coverType);
    };
}
