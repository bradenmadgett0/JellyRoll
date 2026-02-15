/**
 * Sonarr React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ServerConfig } from '../../types/server';
import { SonarrClient } from '../api/sonarr';
import { useServerStore } from '../stores/serverStore';

function createClient(server: ServerConfig): SonarrClient {
    return new SonarrClient(server);
}

function useSonarrServer(): ServerConfig | undefined {
    return useServerStore((s) => s.servers.find((srv) => srv.type === 'sonarr'));
}

// ─── Series ─────────────────────────────────────────

export function useSonarrSeries() {
    const server = useSonarrServer();

    return useQuery({
        queryKey: ['sonarr', 'series', server?.id],
        queryFn: async () => {
            if (!server) throw new Error('No Sonarr server configured');
            const client = createClient(server);
            return client.getSeries();
        },
        enabled: !!server,
        staleTime: 2 * 60 * 1000,
    });
}

export function useSonarrSeriesDetail(id: number | undefined) {
    const server = useSonarrServer();

    return useQuery({
        queryKey: ['sonarr', 'series', server?.id, id],
        queryFn: async () => {
            if (!server || id === undefined) throw new Error('Missing params');
            const client = createClient(server);
            return client.getSeriesDetail(id);
        },
        enabled: !!server && id !== undefined,
        staleTime: 60 * 1000,
    });
}

// ─── Episodes ───────────────────────────────────────

export function useSonarrEpisodes(seriesId: number | undefined) {
    const server = useSonarrServer();

    return useQuery({
        queryKey: ['sonarr', 'episodes', server?.id, seriesId],
        queryFn: async () => {
            if (!server || seriesId === undefined) throw new Error('Missing params');
            const client = createClient(server);
            return client.getEpisodes(seriesId);
        },
        enabled: !!server && seriesId !== undefined,
        staleTime: 60 * 1000,
    });
}

// ─── Calendar ───────────────────────────────────────

export function useSonarrCalendar(start: string, end: string) {
    const server = useSonarrServer();

    return useQuery({
        queryKey: ['sonarr', 'calendar', server?.id, start, end],
        queryFn: async () => {
            if (!server) throw new Error('No Sonarr server configured');
            const client = createClient(server);
            return client.getCalendar(start, end);
        },
        enabled: !!server,
        staleTime: 5 * 60 * 1000,
    });
}

// ─── Queue ──────────────────────────────────────────

export function useSonarrQueue() {
    const server = useSonarrServer();

    return useQuery({
        queryKey: ['sonarr', 'queue', server?.id],
        queryFn: async () => {
            if (!server) throw new Error('No Sonarr server configured');
            const client = createClient(server);
            return client.getQueue();
        },
        enabled: !!server,
        staleTime: 15 * 1000, // refresh often
        refetchInterval: 30 * 1000,
    });
}

// ─── Lookup ─────────────────────────────────────────

export function useSonarrLookup(term: string) {
    const server = useSonarrServer();

    return useQuery({
        queryKey: ['sonarr', 'lookup', server?.id, term],
        queryFn: async () => {
            if (!server) throw new Error('No Sonarr server configured');
            const client = createClient(server);
            return client.lookupSeries(term);
        },
        enabled: !!server && term.length >= 2,
        staleTime: 60 * 1000,
    });
}

// ─── Commands (mutations) ───────────────────────────

export function useSonarrRefresh() {
    const server = useSonarrServer();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (seriesId?: number) => {
            if (!server) throw new Error('No Sonarr server configured');
            const client = createClient(server);
            return client.refreshSeries(seriesId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sonarr'] });
        },
    });
}

export function useSonarrEpisodeSearch() {
    const server = useSonarrServer();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (episodeIds: number[]) => {
            if (!server) throw new Error('No Sonarr server configured');
            const client = createClient(server);
            return client.searchEpisodes(episodeIds);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sonarr', 'queue'] });
        },
    });
}

// ─── Image URL Helper ───────────────────────────────

export function useSonarrImageUrl() {
    const server = useSonarrServer();

    return (seriesId: number, coverType: string = 'poster'): string | null => {
        if (!server) return null;
        const client = createClient(server);
        return client.getSeriesImageUrl(seriesId, coverType);
    };
}
