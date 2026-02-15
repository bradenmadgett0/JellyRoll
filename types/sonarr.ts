/**
 * Sonarr-specific API response types
 */

import { ServarrCalendarItem } from './servarr';

export interface SonarrSeries {
    id: number;
    title: string;
    sortTitle: string;
    status: 'continuing' | 'ended' | 'upcoming' | 'deleted';
    overview?: string;
    network?: string;
    airTime?: string;
    images: SonarrImage[];
    seasons: SonarrSeason[];
    year: number;
    path: string;
    qualityProfileId: number;
    seasonFolder: boolean;
    monitored: boolean;
    runtime: number;
    tvdbId?: number;
    imdbId?: string;
    titleSlug: string;
    certification?: string;
    genres: string[];
    tags: number[];
    added: string;
    ratings?: { votes: number; value: number };
    statistics?: SonarrSeriesStatistics;
    languageProfileId?: number;
    rootFolderPath?: string;
}

export interface SonarrSeason {
    seasonNumber: number;
    monitored: boolean;
    statistics?: {
        episodeFileCount: number;
        episodeCount: number;
        totalEpisodeCount: number;
        sizeOnDisk: number;
        percentOfEpisodes: number;
        previousAiring?: string;
        nextAiring?: string;
    };
}

export interface SonarrSeriesStatistics {
    seasonCount: number;
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
}

export interface SonarrEpisode {
    id: number;
    seriesId: number;
    episodeFileId: number;
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    airDate?: string;
    airDateUtc?: string;
    overview?: string;
    hasFile: boolean;
    monitored: boolean;
    absoluteEpisodeNumber?: number;
    sceneAbsoluteEpisodeNumber?: number;
    sceneEpisodeNumber?: number;
    sceneSeasonNumber?: number;
    unverifiedSceneNumbering: boolean;
    grabbed: boolean;
}

export interface SonarrImage {
    coverType: 'banner' | 'poster' | 'fanart' | 'logo' | 'clearart' | 'screenshot';
    url: string;
    remoteUrl?: string;
}

export interface SonarrCalendarItem extends ServarrCalendarItem {
    seriesId: number;
    seasonNumber: number;
    episodeNumber: number;
    absoluteEpisodeNumber?: number;
    series?: SonarrSeries;
}

export interface SonarrLookupResult {
    title: string;
    sortTitle: string;
    status: string;
    overview?: string;
    images: SonarrImage[];
    seasons: SonarrSeason[];
    year: number;
    tvdbId: number;
    imdbId?: string;
    titleSlug: string;
    runtime: number;
    genres: string[];
    ratings?: { votes: number; value: number };
}
