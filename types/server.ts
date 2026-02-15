/**
 * Server configuration types
 */

export type ServerType = 'jellyfin' | 'sonarr' | 'radarr' | 'lidarr';

export interface ServerConfig {
    id: string;
    name: string;
    type: ServerType;
    url: string;
    /** For *arr servers — stored encrypted in SecureStore */
    apiKey?: string;
    /** For Jellyfin — obtained from AuthenticateByName, stored encrypted */
    accessToken?: string;
    /** Jellyfin user ID */
    userId?: string;
    /** Whether this server connection works over HTTPS */
    isHttps: boolean;
    /** User explicitly accepted HTTP connection (local network) */
    httpAllowed: boolean;
    /** Last successful connection timestamp */
    lastConnected?: string;
    /** Server version from status endpoint */
    serverVersion?: string;
    /** Display order */
    sortOrder: number;
}

export interface ServerStatus {
    online: boolean;
    version?: string;
    error?: string;
}

export interface ConnectionTestResult {
    success: boolean;
    serverName?: string;
    serverVersion?: string;
    error?: string;
}

export const SERVER_TYPE_LABELS: Record<ServerType, string> = {
    jellyfin: 'Jellyfin',
    sonarr: 'Sonarr',
    radarr: 'Radarr',
    lidarr: 'Lidarr',
};

export const SERVER_TYPE_DESCRIPTIONS: Record<ServerType, string> = {
    jellyfin: 'Media server for streaming movies, shows & music',
    sonarr: 'TV series management & automation',
    radarr: 'Movie management & automation',
    lidarr: 'Music management & automation',
};
