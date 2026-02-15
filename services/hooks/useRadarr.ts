/**
 * Radarr React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ServerConfig } from '../../types/server';
import { RadarrClient } from '../api/radarr';
import { useServerStore } from '../stores/serverStore';

function createClient(server: ServerConfig): RadarrClient {
    return new RadarrClient(server);
}

function useRadarrServer(): ServerConfig | undefined {
    return useServerStore((s) => s.servers.find((srv) => srv.type === 'radarr'));
}

// ─── Movies ─────────────────────────────────────────

export function useRadarrMovies() {
    const server = useRadarrServer();

    return useQuery({
        queryKey: ['radarr', 'movies', server?.id],
        queryFn: async () => {
            if (!server) throw new Error('No Radarr server configured');
            const client = createClient(server);
            return client.getMovies();
        },
        enabled: !!server,
        staleTime: 2 * 60 * 1000,
    });
}

export function useRadarrMovieDetail(id: number | undefined) {
    const server = useRadarrServer();

    return useQuery({
        queryKey: ['radarr', 'movie', server?.id, id],
        queryFn: async () => {
            if (!server || id === undefined) throw new Error('Missing params');
            const client = createClient(server);
            return client.getMovieDetail(id);
        },
        enabled: !!server && id !== undefined,
        staleTime: 60 * 1000,
    });
}

// ─── Calendar ───────────────────────────────────────

export function useRadarrCalendar(start: string, end: string) {
    const server = useRadarrServer();

    return useQuery({
        queryKey: ['radarr', 'calendar', server?.id, start, end],
        queryFn: async () => {
            if (!server) throw new Error('No Radarr server configured');
            const client = createClient(server);
            return client.getCalendar(start, end);
        },
        enabled: !!server,
        staleTime: 5 * 60 * 1000,
    });
}

// ─── Queue ──────────────────────────────────────────

export function useRadarrQueue() {
    const server = useRadarrServer();

    return useQuery({
        queryKey: ['radarr', 'queue', server?.id],
        queryFn: async () => {
            if (!server) throw new Error('No Radarr server configured');
            const client = createClient(server);
            return client.getQueue();
        },
        enabled: !!server,
        staleTime: 15 * 1000,
        refetchInterval: 30 * 1000,
    });
}

// ─── Lookup ─────────────────────────────────────────

export function useRadarrLookup(term: string) {
    const server = useRadarrServer();

    return useQuery({
        queryKey: ['radarr', 'lookup', server?.id, term],
        queryFn: async () => {
            if (!server) throw new Error('No Radarr server configured');
            const client = createClient(server);
            return client.lookupMovie(term);
        },
        enabled: !!server && term.length >= 2,
        staleTime: 60 * 1000,
    });
}

// ─── Commands ───────────────────────────────────────

export function useRadarrRefresh() {
    const server = useRadarrServer();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (movieId?: number) => {
            if (!server) throw new Error('No Radarr server configured');
            const client = createClient(server);
            return client.refreshMovie(movieId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['radarr'] });
        },
    });
}

export function useRadarrMovieSearch() {
    const server = useRadarrServer();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (movieIds: number[]) => {
            if (!server) throw new Error('No Radarr server configured');
            const client = createClient(server);
            return client.searchMovie(movieIds);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['radarr', 'queue'] });
        },
    });
}

// ─── Image URL Helper ───────────────────────────────

export function useRadarrImageUrl() {
    const server = useRadarrServer();

    return (movieId: number, coverType: string = 'poster'): string | null => {
        if (!server) return null;
        const client = createClient(server);
        return client.getMovieImageUrl(movieId, coverType);
    };
}
