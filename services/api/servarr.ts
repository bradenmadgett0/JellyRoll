/**
 * Generic Servarr API base client
 * Shared functionality across Sonarr, Radarr, and Lidarr
 */

import axios, { AxiosInstance } from 'axios';
import {
    QualityProfile,
    ServarrCalendarItem,
    ServarrCommand,
    ServarrDownloadClient,
    ServarrQueueResponse,
    ServarrRootFolder,
    ServarrSystemStatus,
    ServarrTag,
} from '../../types/servarr';
import { ConnectionTestResult, ServerConfig } from '../../types/server';

export class ServarrClient {
    protected client: AxiosInstance;
    protected server: ServerConfig;
    protected apiVersion: string;

    constructor(server: ServerConfig, apiVersion: string = 'v3') {
        this.server = server;
        this.apiVersion = apiVersion;

        const baseURL = `${server.url}/api/${apiVersion}`;

        this.client = axios.create({
            baseURL,
            timeout: 15000,
            headers: {
                'X-Api-Key': server.apiKey ?? '',
                'Content-Type': 'application/json',
            },
        });

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response) {
                    const msg = `Servarr API error ${error.response.status}: ${error.response.statusText}`;
                    console.error(msg);
                    throw new Error(msg);
                } else if (error.request) {
                    throw new Error('No response from server. Check your connection and server URL.');
                }
                throw error;
            }
        );
    }

    /** Test connection to the server */
    async testConnection(): Promise<ConnectionTestResult> {
        try {
            const status = await this.getSystemStatus();
            return {
                success: true,
                serverName: status.instanceName || status.appName,
                serverVersion: status.version,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    // ─── System ──────────────────────────────────────────

    async getSystemStatus(): Promise<ServarrSystemStatus> {
        const { data } = await this.client.get('/system/status');
        return data;
    }

    // ─── Queue ───────────────────────────────────────────

    async getQueue(page: number = 1, pageSize: number = 20): Promise<ServarrQueueResponse> {
        const { data } = await this.client.get('/queue', {
            params: { page, pageSize, includeUnknownSeriesItems: true },
        });
        return data;
    }

    // ─── Calendar ────────────────────────────────────────

    async getCalendar(start: string, end: string): Promise<ServarrCalendarItem[]> {
        const { data } = await this.client.get('/calendar', {
            params: { start, end, unmonitored: false },
        });
        return data;
    }

    // ─── Commands ────────────────────────────────────────

    async getCommands(): Promise<ServarrCommand[]> {
        const { data } = await this.client.get('/command');
        return data;
    }

    async postCommand(name: string, body: Record<string, unknown> = {}): Promise<ServarrCommand> {
        const { data } = await this.client.post('/command', { name, ...body });
        return data;
    }

    // ─── Root Folders ────────────────────────────────────

    async getRootFolders(): Promise<ServarrRootFolder[]> {
        const { data } = await this.client.get('/rootfolder');
        return data;
    }

    // ─── Quality Profiles ───────────────────────────────

    async getQualityProfiles(): Promise<QualityProfile[]> {
        const { data } = await this.client.get('/qualityprofile');
        return data;
    }

    // ─── Tags ────────────────────────────────────────────

    async getTags(): Promise<ServarrTag[]> {
        const { data } = await this.client.get('/tag');
        return data;
    }

    // ─── Download Clients ───────────────────────────────

    async getDownloadClients(): Promise<ServarrDownloadClient[]> {
        const { data } = await this.client.get('/downloadclient');
        return data;
    }
}
