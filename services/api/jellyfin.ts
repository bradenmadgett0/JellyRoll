/**
 * Jellyfin API Client
 * Handles authentication, library browsing, and media streaming
 */

import axios, { AxiosInstance } from 'axios';
import {
    JellyfinAuthResponse,
    JellyfinItem,
    JellyfinItemsResponse,
    JellyfinLibraryResponse,
    JellyfinSystemInfo,
} from '../../types/jellyfin';
import { ConnectionTestResult, ServerConfig } from '../../types/server';

const CLIENT_NAME = 'JellyRoll';
const CLIENT_VERSION = '1.0.0';
const DEVICE_NAME = 'JellyRoll Mobile';

function generateDeviceId(): string {
    return 'jellyroll_' + Math.random().toString(36).substring(2, 15);
}

export class JellyfinClient {
    private client: AxiosInstance;
    private server: ServerConfig;
    private deviceId: string;

    constructor(server: ServerConfig, deviceId?: string) {
        this.server = server;
        this.deviceId = deviceId ?? generateDeviceId();

        this.client = axios.create({
            baseURL: server.url,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add auth header to all requests
        this.client.interceptors.request.use((config) => {
            const params = [
                `Client="${CLIENT_NAME}"`,
                `Device="${DEVICE_NAME}"`,
                `DeviceId="${this.deviceId}"`,
                `Version="${CLIENT_VERSION}"`,
            ];
            if (this.server.accessToken) {
                params.push(`Token="${this.server.accessToken}"`);
            }
            config.headers['Authorization'] = `MediaBrowser ${params.join(', ')}`;
            return config;
        });

        // Error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    throw new Error('Authentication failed. Please re-enter your credentials.');
                }
                if (error.response) {
                    throw new Error(`Jellyfin error ${error.response.status}: ${error.response.statusText}`);
                }
                if (error.request) {
                    throw new Error('No response from Jellyfin server. Check your connection.');
                }
                throw error;
            }
        );
    }

    // ─── Authentication ──────────────────────────────────

    async authenticateByName(username: string, password: string): Promise<JellyfinAuthResponse> {
        const { data } = await this.client.post('/Users/AuthenticateByName', {
            Username: username,
            Pw: password,
        });
        return data;
    }

    /** Test connection (unauthenticated — just checks server is reachable) */
    async testConnection(): Promise<ConnectionTestResult> {
        try {
            const info = await this.getSystemInfo();
            return {
                success: true,
                serverName: info.ServerName,
                serverVersion: info.Version,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    // ─── System ──────────────────────────────────────────

    async getSystemInfo(): Promise<JellyfinSystemInfo> {
        const { data } = await this.client.get('/System/Info/Public');
        return data;
    }

    // ─── Libraries ───────────────────────────────────────

    async getLibraries(): Promise<JellyfinLibraryResponse> {
        const userId = this.server.userId;
        if (!userId) throw new Error('Not authenticated. User ID is missing.');
        const { data } = await this.client.get(`/Users/${userId}/Views`);
        return data;
    }

    // ─── Items ───────────────────────────────────────────

    async getItems(params: {
        parentId?: string;
        includeItemTypes?: string;
        sortBy?: string;
        sortOrder?: string;
        limit?: number;
        startIndex?: number;
        fields?: string;
        searchTerm?: string;
        filters?: string;
        genres?: string;
        years?: string;
    }): Promise<JellyfinItemsResponse> {
        const userId = this.server.userId;
        if (!userId) throw new Error('Not authenticated. User ID is missing.');

        const { data } = await this.client.get(`/Users/${userId}/Items`, {
            params: {
                ParentId: params.parentId,
                IncludeItemTypes: params.includeItemTypes,
                SortBy: params.sortBy ?? 'SortName',
                SortOrder: params.sortOrder ?? 'Ascending',
                Limit: params.limit,
                StartIndex: params.startIndex ?? 0,
                Fields: params.fields ?? 'Overview,PrimaryImageAspectRatio,MediaSources,Genres',
                SearchTerm: params.searchTerm,
                Filters: params.filters,
                Genres: params.genres,
                Years: params.years,
                Recursive: true,
                ImageTypeLimit: 1,
                EnableImageTypes: 'Primary,Backdrop,Thumb',
            },
        });
        return data;
    }

    async getItemDetail(itemId: string): Promise<JellyfinItem> {
        const userId = this.server.userId;
        if (!userId) throw new Error('Not authenticated. User ID is missing.');

        const { data } = await this.client.get(`/Users/${userId}/Items/${itemId}`, {
            params: {
                Fields: 'Overview,PrimaryImageAspectRatio,MediaSources,Genres,Studios,People,ExternalUrls',
            },
        });
        return data;
    }

    // ─── Resume / Latest ────────────────────────────────

    async getResumeItems(limit: number = 12): Promise<JellyfinItemsResponse> {
        const userId = this.server.userId;
        if (!userId) throw new Error('Not authenticated. User ID is missing.');

        const { data } = await this.client.get(`/Users/${userId}/Items/Resume`, {
            params: {
                Limit: limit,
                Fields: 'Overview,PrimaryImageAspectRatio',
                ImageTypeLimit: 1,
                EnableImageTypes: 'Primary,Backdrop,Thumb',
                MediaTypes: 'Video',
            },
        });
        return data;
    }

    async getLatestItems(parentId?: string, limit: number = 16): Promise<JellyfinItem[]> {
        const userId = this.server.userId;
        if (!userId) throw new Error('Not authenticated. User ID is missing.');

        const { data } = await this.client.get(`/Users/${userId}/Items/Latest`, {
            params: {
                ParentId: parentId,
                Limit: limit,
                Fields: 'Overview,PrimaryImageAspectRatio',
                ImageTypeLimit: 1,
                EnableImageTypes: 'Primary,Backdrop,Thumb',
            },
        });
        return data;
    }

    // ─── Streaming URLs ─────────────────────────────────

    getStreamUrl(itemId: string): string {
        const token = this.server.accessToken ?? '';
        return `${this.server.url}/Videos/${itemId}/stream?static=true&api_key=${token}`;
    }

    getHlsStreamUrl(itemId: string, maxBitrate?: number | null): string {
        const token = this.server.accessToken ?? '';
        let url = `${this.server.url}/Videos/${itemId}/master.m3u8?api_key=${token}&DeviceId=${this.deviceId}&MediaSourceId=${itemId}&VideoCodec=h264&AudioCodec=aac&MaxAudioChannels=6&TranscodingMaxAudioChannels=6&SegmentContainer=ts`;
        if (maxBitrate && maxBitrate > 0) {
            url += `&videoBitRate=${maxBitrate}`;
        }
        return url;
    }

    // ─── Image URLs ─────────────────────────────────────

    getImageUrl(
        itemId: string,
        imageType: 'Primary' | 'Backdrop' | 'Thumb' | 'Banner' | 'Logo' = 'Primary',
        maxWidth?: number,
        maxHeight?: number
    ): string {
        let url = `${this.server.url}/Items/${itemId}/Images/${imageType}`;
        const params: string[] = [];
        if (maxWidth) params.push(`maxWidth=${maxWidth}`);
        if (maxHeight) params.push(`maxHeight=${maxHeight}`);
        params.push('quality=90');
        if (params.length) url += `?${params.join('&')}`;
        return url;
    }

    // ─── Playback Session Reporting ─────────────────────

    async reportPlaybackStart(itemId: string, positionTicks: number = 0): Promise<void> {
        await this.client.post('/Sessions/Playing', {
            ItemId: itemId,
            PositionTicks: positionTicks,
            PlayMethod: 'Transcode',
            PlaySessionId: this.deviceId,
        });
    }

    async reportPlaybackProgress(
        itemId: string,
        positionTicks: number,
        isPaused: boolean = false,
    ): Promise<void> {
        await this.client.post('/Sessions/Playing/Progress', {
            ItemId: itemId,
            PositionTicks: positionTicks,
            IsPaused: isPaused,
            PlayMethod: 'Transcode',
            PlaySessionId: this.deviceId,
        });
    }

    async reportPlaybackStopped(itemId: string, positionTicks: number): Promise<void> {
        await this.client.post('/Sessions/Playing/Stopped', {
            ItemId: itemId,
            PositionTicks: positionTicks,
            PlaySessionId: this.deviceId,
        });
    }

    // ─── Search ──────────────────────────────────────────

    async search(searchTerm: string, limit: number = 20): Promise<JellyfinItemsResponse> {
        return this.getItems({
            searchTerm,
            limit,
            includeItemTypes: 'Movie,Series,Episode,MusicAlbum,MusicArtist,Audio',
            sortBy: 'SearchScore,SortName',
            sortOrder: 'Descending',
        });
    }
}
