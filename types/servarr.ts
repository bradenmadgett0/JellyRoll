/**
 * Shared Servarr types — common across Sonarr, Radarr, Lidarr
 */

export interface ServarrSystemStatus {
    appName: string;
    instanceName: string;
    version: string;
    buildTime: string;
    isDebug: boolean;
    isProduction: boolean;
    isAdmin: boolean;
    isUserInteractive: boolean;
    startupPath: string;
    appData: string;
    osName: string;
    osVersion: string;
    isDocker: boolean;
    isLinux: boolean;
    isOsx: boolean;
    isWindows: boolean;
    urlBase: string;
}

export interface ServarrQueueItem {
    id: number;
    title: string;
    status: string;
    trackedDownloadStatus?: string;
    trackedDownloadState?: string;
    statusMessages?: Array<{ title: string; messages: string[] }>;
    downloadId?: string;
    protocol: string;
    downloadClient?: string;
    indexer?: string;
    size: number;
    sizeleft: number;
    timeleft?: string;
    estimatedCompletionTime?: string;
    quality: QualityModel;
    outputPath?: string;
}

export interface ServarrQueueResponse {
    page: number;
    pageSize: number;
    sortKey: string;
    sortDirection: string;
    totalRecords: number;
    records: ServarrQueueItem[];
}

export interface ServarrCalendarItem {
    id: number;
    title: string;
    overview?: string;
    airDateUtc?: string;
    hasFile: boolean;
    monitored: boolean;
}

export interface ServarrCommand {
    id: number;
    name: string;
    commandName: string;
    message?: string;
    body: Record<string, unknown>;
    priority: string;
    status: 'queued' | 'started' | 'completed' | 'failed' | 'cancelled';
    result: string;
    queued: string;
    started?: string;
    ended?: string;
    trigger: string;
}

export interface ServarrRootFolder {
    id: number;
    path: string;
    accessible: boolean;
    freeSpace: number;
    totalSpace?: number;
}

export interface QualityModel {
    quality: {
        id: number;
        name: string;
        source?: string;
        resolution?: number;
    };
    revision?: {
        version: number;
        real: number;
        isRepack: boolean;
    };
}

export interface QualityProfile {
    id: number;
    name: string;
    upgradeAllowed: boolean;
    cutoff: number;
    items: Array<{
        id?: number;
        name?: string;
        quality?: { id: number; name: string };
        items?: unknown[];
        allowed: boolean;
    }>;
}

export interface ServarrTag {
    id: number;
    label: string;
}

export interface ServarrDownloadClient {
    id: number;
    name: string;
    protocol: string;
    implementation: string;
    enable: boolean;
}
