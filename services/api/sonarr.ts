/**
 * Sonarr API Client — extends ServarrClient
 */

import { ServerConfig } from '../../types/server';
import {
    SonarrCalendarItem,
    SonarrEpisode,
    SonarrLookupResult,
    SonarrSeries,
} from '../../types/sonarr';
import { ServarrClient } from './servarr';

export class SonarrClient extends ServarrClient {
    constructor(server: ServerConfig) {
        super(server, 'v3');
    }

    // ─── Series ──────────────────────────────────────────

    async getSeries(): Promise<SonarrSeries[]> {
        const { data } = await this.client.get('/series');
        return data;
    }

    async getSeriesDetail(id: number): Promise<SonarrSeries> {
        const { data } = await this.client.get(`/series/${id}`);
        return data;
    }

    async addSeries(payload: Partial<SonarrSeries> & {
        tvdbId: number;
        title: string;
        qualityProfileId: number;
        rootFolderPath: string;
        monitored?: boolean;
        seasonFolder?: boolean;
    }): Promise<SonarrSeries> {
        const { data } = await this.client.post('/series', {
            monitored: true,
            seasonFolder: true,
            ...payload,
        });
        return data;
    }

    async deleteSeries(id: number, deleteFiles: boolean = false): Promise<void> {
        await this.client.delete(`/series/${id}`, {
            params: { deleteFiles },
        });
    }

    // ─── Episodes ────────────────────────────────────────

    async getEpisodes(seriesId: number): Promise<SonarrEpisode[]> {
        const { data } = await this.client.get('/episode', {
            params: { seriesId },
        });
        return data;
    }

    async getEpisodeDetail(id: number): Promise<SonarrEpisode> {
        const { data } = await this.client.get(`/episode/${id}`);
        return data;
    }

    async toggleEpisodeMonitored(episodeId: number, monitored: boolean): Promise<SonarrEpisode> {
        const { data } = await this.client.put(`/episode/${episodeId}`, { monitored });
        return data;
    }

    // ─── Calendar (override for typed response) ─────────

    async getCalendar(start: string, end: string): Promise<SonarrCalendarItem[]> {
        const { data } = await this.client.get('/calendar', {
            params: { start, end, unmonitored: false, includeSeries: true },
        });
        return data;
    }

    // ─── Search / Lookup ────────────────────────────────

    async lookupSeries(term: string): Promise<SonarrLookupResult[]> {
        const { data } = await this.client.get('/series/lookup', {
            params: { term },
        });
        return data;
    }

    // ─── Commands (typed shortcuts) ─────────────────────

    async refreshSeries(seriesId?: number) {
        return this.postCommand('RefreshSeries', seriesId ? { seriesId } : {});
    }

    async searchEpisodes(episodeIds: number[]) {
        return this.postCommand('EpisodeSearch', { episodeIds });
    }

    async seasonSearch(seriesId: number, seasonNumber: number) {
        return this.postCommand('SeasonSearch', { seriesId, seasonNumber });
    }

    // ─── Image URL Helper ──────────────────────────────

    getSeriesImageUrl(seriesId: number, coverType: string = 'poster'): string {
        return `${this.server.url}/api/v3/MediaCover/${seriesId}/${coverType}.jpg?apikey=${this.server.apiKey}`;
    }
}
