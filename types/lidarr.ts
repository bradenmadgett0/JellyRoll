/**
 * Lidarr-specific API response types
 */


export interface LidarrArtist {
    id: number;
    artistName: string;
    sortName: string;
    status: 'continuing' | 'ended';
    overview?: string;
    artistType?: string;
    disambiguation?: string;
    images: LidarrImage[];
    path: string;
    qualityProfileId: number;
    metadataProfileId: number;
    monitored: boolean;
    monitorNewItems: string;
    genres: string[];
    tags: number[];
    added: string;
    foreignArtistId: string;
    rootFolderPath?: string;
    statistics?: LidarrArtistStatistics;
}

export interface LidarrArtistStatistics {
    albumCount: number;
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
}

export interface LidarrAlbum {
    id: number;
    title: string;
    disambiguation?: string;
    overview?: string;
    artistId: number;
    foreignAlbumId: string;
    monitored: boolean;
    anyReleaseOk: boolean;
    profileId: number;
    duration: number;
    albumType: string;
    genres: string[];
    images: LidarrImage[];
    releaseDate?: string;
    ratings?: { votes: number; value: number };
    artist?: LidarrArtist;
    statistics?: {
        trackFileCount: number;
        trackCount: number;
        totalTrackCount: number;
        sizeOnDisk: number;
        percentOfTracks: number;
    };
}

export interface LidarrTrack {
    id: number;
    artistId: number;
    foreignTrackId: string;
    albumId: number;
    title: string;
    trackNumber: string;
    duration: number;
    explicit: boolean;
    hasFile: boolean;
    monitored: boolean;
    mediumNumber: number;
    absoluteTrackNumber: number;
    trackFileId?: number;
}

export interface LidarrImage {
    coverType: 'poster' | 'banner' | 'fanart' | 'logo' | 'disc' | 'cover';
    url: string;
    remoteUrl?: string;
}

export interface LidarrLookupResult {
    artistName: string;
    overview?: string;
    images: LidarrImage[];
    foreignArtistId: string;
    artistType?: string;
    disambiguation?: string;
}
