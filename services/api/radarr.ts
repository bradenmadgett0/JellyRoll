/**
 * Radarr API Client — extends ServarrClient
 */

import {
    RadarrCalendarItem,
    RadarrLookupResult,
    RadarrMovie,
} from '../../types/radarr';
import { ServerConfig } from '../../types/server';
import { ServarrClient } from './servarr';

export class RadarrClient extends ServarrClient {
    constructor(server: ServerConfig) {
        super(server, 'v3');
    }

    // ─── Movies ──────────────────────────────────────────

    async getMovies(): Promise<RadarrMovie[]> {
        const { data } = await this.client.get('/movie');
        return data;
    }

    async getMovieDetail(id: number): Promise<RadarrMovie> {
        const { data } = await this.client.get(`/movie/${id}`);
        return data;
    }

    async addMovie(payload: Partial<RadarrMovie> & {
        tmdbId: number;
        title: string;
        qualityProfileId: number;
        rootFolderPath: string;
        monitored?: boolean;
        minimumAvailability?: string;
    }): Promise<RadarrMovie> {
        const { data } = await this.client.post('/movie', {
            monitored: true,
            minimumAvailability: 'released',
            addOptions: { searchForMovie: true },
            ...payload,
        });
        return data;
    }

    async deleteMovie(id: number, deleteFiles: boolean = false): Promise<void> {
        await this.client.delete(`/movie/${id}`, {
            params: { deleteFiles, addImportExclusion: false },
        });
    }

    // ─── Calendar (override for typed response) ─────────

    async getCalendar(start: string, end: string): Promise<RadarrCalendarItem[]> {
        const { data } = await this.client.get('/calendar', {
            params: { start, end, unmonitored: false },
        });
        return data;
    }

    // ─── Search / Lookup ────────────────────────────────

    async lookupMovie(term: string): Promise<RadarrLookupResult[]> {
        const { data } = await this.client.get('/movie/lookup', {
            params: { term },
        });
        return data;
    }

    // ─── Commands (typed shortcuts) ─────────────────────

    async refreshMovie(movieId?: number) {
        return this.postCommand('RefreshMovie', movieId ? { movieId } : {});
    }

    async searchMovie(movieIds: number[]) {
        return this.postCommand('MoviesSearch', { movieIds });
    }

    // ─── Image URL Helper ──────────────────────────────

    getMovieImageUrl(movieId: number, coverType: string = 'poster'): string {
        return `${this.server.url}/api/v3/MediaCover/${movieId}/${coverType}.jpg?apikey=${this.server.apiKey}`;
    }
}
