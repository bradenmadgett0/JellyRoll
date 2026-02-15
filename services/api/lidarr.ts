/**
 * Lidarr API Client — extends ServarrClient
 * Note: Lidarr uses API v1, not v3
 */

import {
    LidarrAlbum,
    LidarrArtist,
    LidarrLookupResult,
    LidarrTrack,
} from '../../types/lidarr';
import { ServerConfig } from '../../types/server';
import { ServarrClient } from './servarr';

export class LidarrClient extends ServarrClient {
    constructor(server: ServerConfig) {
        // Lidarr uses API v1
        super(server, 'v1');
    }

    // ─── Artists ─────────────────────────────────────────

    async getArtists(): Promise<LidarrArtist[]> {
        const { data } = await this.client.get('/artist');
        return data;
    }

    async getArtistDetail(id: number): Promise<LidarrArtist> {
        const { data } = await this.client.get(`/artist/${id}`);
        return data;
    }

    async addArtist(payload: Partial<LidarrArtist> & {
        foreignArtistId: string;
        artistName: string;
        qualityProfileId: number;
        metadataProfileId: number;
        rootFolderPath: string;
        monitored?: boolean;
        monitorNewItems?: string;
    }): Promise<LidarrArtist> {
        const { data } = await this.client.post('/artist', {
            monitored: true,
            monitorNewItems: 'all',
            addOptions: { searchForMissingAlbums: true },
            ...payload,
        });
        return data;
    }

    async deleteArtist(id: number, deleteFiles: boolean = false): Promise<void> {
        await this.client.delete(`/artist/${id}`, {
            params: { deleteFiles },
        });
    }

    // ─── Albums ──────────────────────────────────────────

    async getAlbums(artistId?: number): Promise<LidarrAlbum[]> {
        const { data } = await this.client.get('/album', {
            params: artistId ? { artistId } : {},
        });
        return data;
    }

    async getAlbumDetail(id: number): Promise<LidarrAlbum> {
        const { data } = await this.client.get(`/album/${id}`);
        return data;
    }

    // ─── Tracks ──────────────────────────────────────────

    async getTracks(albumId: number): Promise<LidarrTrack[]> {
        const { data } = await this.client.get('/track', {
            params: { albumId },
        });
        return data;
    }

    // ─── Search / Lookup ────────────────────────────────

    async lookupArtist(term: string): Promise<LidarrLookupResult[]> {
        const { data } = await this.client.get('/artist/lookup', {
            params: { term },
        });
        return data;
    }

    // ─── Commands (typed shortcuts) ─────────────────────

    async refreshArtist(artistId?: number) {
        return this.postCommand('RefreshArtist', artistId ? { artistId } : {});
    }

    async searchAlbum(albumIds: number[]) {
        return this.postCommand('AlbumSearch', { albumIds });
    }

    // ─── Image URL Helper ──────────────────────────────

    getArtistImageUrl(artistId: number, coverType: string = 'poster'): string {
        return `${this.server.url}/api/v1/MediaCover/Artist/${artistId}/${coverType}.jpg?apikey=${this.server.apiKey}`;
    }
}
