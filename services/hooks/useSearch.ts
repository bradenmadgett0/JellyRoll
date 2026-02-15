/**
 * useSearch — Combined cross-service search with debounce
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { JellyfinItem } from '../../types/jellyfin';
import { LidarrLookupResult } from '../../types/lidarr';
import { RadarrLookupResult } from '../../types/radarr';
import { SonarrLookupResult } from '../../types/sonarr';
import { JellyfinClient } from '../api/jellyfin';
import { LidarrClient } from '../api/lidarr';
import { RadarrClient } from '../api/radarr';
import { SonarrClient } from '../api/sonarr';
import { useServerStore } from '../stores/serverStore';

export interface SearchResult {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    year?: number;
    source: 'jellyfin' | 'sonarr' | 'radarr' | 'lidarr';
    sourceId: string | number;
    type: string;
}

function useDebounce(value: string, delay: number): string {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

export function useGlobalSearch(query: string) {
    const debouncedQuery = useDebounce(query.trim(), 350);
    const servers = useServerStore((s) => s.servers);

    const jellyfinServer = servers.find((s) => s.type === 'jellyfin');
    const sonarrServer = servers.find((s) => s.type === 'sonarr');
    const radarrServer = servers.find((s) => s.type === 'radarr');
    const lidarrServer = servers.find((s) => s.type === 'lidarr');

    const enabled = debouncedQuery.length >= 2;

    // Jellyfin search
    const jellyfinQuery = useQuery({
        queryKey: ['search', 'jellyfin', jellyfinServer?.id, debouncedQuery],
        queryFn: async (): Promise<SearchResult[]> => {
            if (!jellyfinServer) return [];
            const client = new JellyfinClient(jellyfinServer);
            const result = await client.search(debouncedQuery, 15);
            const items = result.Items ?? [];
            return items.map((item: JellyfinItem) => ({
                id: `jf-${item.Id}`,
                title: item.Name,
                subtitle: item.Type === 'Episode'
                    ? `${item.SeriesName} · S${item.ParentIndexNumber}E${item.IndexNumber}`
                    : item.Type,
                year: item.ProductionYear,
                source: 'jellyfin' as const,
                sourceId: item.Id,
                type: item.Type,
                imageUrl: client.getImageUrl(item.Id, 'Primary', 100),
            }));
        },
        enabled: enabled && !!jellyfinServer,
        staleTime: 30 * 1000,
    });

    // Sonarr lookup
    const sonarrQuery = useQuery({
        queryKey: ['search', 'sonarr', sonarrServer?.id, debouncedQuery],
        queryFn: async (): Promise<SearchResult[]> => {
            if (!sonarrServer) return [];
            const client = new SonarrClient(sonarrServer);
            const results = await client.lookupSeries(debouncedQuery);
            return results.slice(0, 10).map((item: SonarrLookupResult) => ({
                id: `so-${item.tvdbId}`,
                title: item.title,
                subtitle: `${item.year ?? ''}`,
                year: item.year,
                source: 'sonarr' as const,
                sourceId: item.tvdbId,
                type: 'Series',
            }));
        },
        enabled: enabled && !!sonarrServer,
        staleTime: 60 * 1000,
    });

    // Radarr lookup
    const radarrQuery = useQuery({
        queryKey: ['search', 'radarr', radarrServer?.id, debouncedQuery],
        queryFn: async (): Promise<SearchResult[]> => {
            if (!radarrServer) return [];
            const client = new RadarrClient(radarrServer);
            const results = await client.lookupMovie(debouncedQuery);
            return results.slice(0, 10).map((item: RadarrLookupResult) => ({
                id: `ra-${item.tmdbId}`,
                title: item.title,
                subtitle: `${item.year ?? ''} · ${item.runtime ?? 0}min`,
                year: item.year,
                source: 'radarr' as const,
                sourceId: item.tmdbId,
                type: 'Movie',
            }));
        },
        enabled: enabled && !!radarrServer,
        staleTime: 60 * 1000,
    });

    // Lidarr lookup
    const lidarrQuery = useQuery({
        queryKey: ['search', 'lidarr', lidarrServer?.id, debouncedQuery],
        queryFn: async (): Promise<SearchResult[]> => {
            if (!lidarrServer) return [];
            const client = new LidarrClient(lidarrServer);
            const results = await client.lookupArtist(debouncedQuery);
            return results.slice(0, 10).map((item: LidarrLookupResult) => ({
                id: `li-${item.foreignArtistId}`,
                title: item.artistName,
                subtitle: item.artistType ?? 'Artist',
                source: 'lidarr' as const,
                sourceId: item.foreignArtistId,
                type: 'Artist',
            }));
        },
        enabled: enabled && !!lidarrServer,
        staleTime: 60 * 1000,
    });

    const isLoading = jellyfinQuery.isLoading || sonarrQuery.isLoading ||
        radarrQuery.isLoading || lidarrQuery.isLoading;

    const results = useMemo(() => {
        const all: SearchResult[] = [];
        if (jellyfinQuery.data) all.push(...jellyfinQuery.data);
        if (sonarrQuery.data) all.push(...sonarrQuery.data);
        if (radarrQuery.data) all.push(...radarrQuery.data);
        if (lidarrQuery.data) all.push(...lidarrQuery.data);
        return all;
    }, [jellyfinQuery.data, sonarrQuery.data, radarrQuery.data, lidarrQuery.data]);

    const groupedResults = useMemo(() => {
        const groups: Record<string, SearchResult[]> = {};
        results.forEach((r) => {
            if (!groups[r.source]) groups[r.source] = [];
            groups[r.source].push(r);
        });
        return groups;
    }, [results]);

    return {
        results,
        groupedResults,
        isLoading: enabled && isLoading,
        isSearching: enabled,
        totalResults: results.length,
    };
}
