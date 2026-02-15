/**
 * Radarr-specific API response types
 */

import { QualityModel, ServarrCalendarItem } from './servarr';

export interface RadarrMovie {
    id: number;
    title: string;
    sortTitle: string;
    originalTitle?: string;
    overview?: string;
    inCinemas?: string;
    physicalRelease?: string;
    digitalRelease?: string;
    images: RadarrImage[];
    year: number;
    path: string;
    qualityProfileId: number;
    monitored: boolean;
    minimumAvailability: 'announced' | 'inCinemas' | 'released' | 'tba';
    isAvailable: boolean;
    folderName?: string;
    runtime: number;
    tmdbId: number;
    imdbId?: string;
    titleSlug: string;
    certification?: string;
    genres: string[];
    tags: number[];
    added: string;
    ratings?: { imdb?: { votes: number; value: number }; tmdb?: { votes: number; value: number } };
    hasFile: boolean;
    sizeOnDisk: number;
    status: 'released' | 'inCinemas' | 'announced' | 'tba' | 'deleted';
    studio?: string;
    rootFolderPath?: string;
    movieFile?: RadarrMovieFile;
}

export interface RadarrMovieFile {
    id: number;
    relativePath: string;
    path: string;
    size: number;
    dateAdded: string;
    quality: QualityModel;
    mediaInfo?: {
        audioBitrate: number;
        audioChannels: number;
        audioCodec: string;
        audioLanguages: string;
        audioStreamCount: number;
        videoBitDepth: number;
        videoBitrate: number;
        videoCodec: string;
        videoDynamicRangeType: string;
        videoFps: number;
        resolution: string;
        runTime: string;
        scanType: string;
        subtitles: string;
    };
}

export interface RadarrImage {
    coverType: 'poster' | 'fanart' | 'banner' | 'logo' | 'clearart' | 'screenshot';
    url: string;
    remoteUrl?: string;
}

export interface RadarrCalendarItem extends ServarrCalendarItem {
    tmdbId: number;
    imdbId?: string;
    images: RadarrImage[];
    year: number;
    inCinemas?: string;
    physicalRelease?: string;
    digitalRelease?: string;
}

export interface RadarrLookupResult {
    title: string;
    sortTitle: string;
    overview?: string;
    images: RadarrImage[];
    year: number;
    tmdbId: number;
    imdbId?: string;
    titleSlug: string;
    runtime: number;
    genres: string[];
    ratings?: { imdb?: { votes: number; value: number }; tmdb?: { votes: number; value: number } };
    studio?: string;
    status: string;
}
