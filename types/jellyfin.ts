/**
 * Jellyfin API response types
 */

export interface JellyfinAuthResponse {
    User: JellyfinUser;
    AccessToken: string;
    ServerId: string;
}

export interface JellyfinUser {
    Name: string;
    Id: string;
    ServerId: string;
    HasPassword: boolean;
    HasConfiguredPassword: boolean;
    PrimaryImageTag?: string;
}

export interface JellyfinLibrary {
    Name: string;
    Id: string;
    CollectionType?: string;
    ImageTags?: Record<string, string>;
    Type: string;
}

export interface JellyfinLibraryResponse {
    Items: JellyfinLibrary[];
    TotalRecordCount: number;
}

export interface JellyfinItem {
    Id: string;
    Name: string;
    ServerId: string;
    Type: JellyfinItemType;
    MediaType?: string;
    Overview?: string;
    OfficialRating?: string;
    CommunityRating?: number;
    CriticRating?: number;
    RunTimeTicks?: number;
    ProductionYear?: number;
    PremiereDate?: string;
    EndDate?: string;
    Status?: string;
    Genres?: string[];
    Studios?: Array<{ Name: string; Id: string }>;
    People?: Array<{ Name: string; Id: string; Role?: string; Type: string; PrimaryImageTag?: string }>;
    ImageTags?: Record<string, string>;
    BackdropImageTags?: string[];
    ParentId?: string;
    ParentBackdropImageTags?: string[];
    ParentBackdropItemId?: string;
    // TV Show specific
    SeriesId?: string;
    SeriesName?: string;
    SeasonId?: string;
    SeasonName?: string;
    IndexNumber?: number;
    ParentIndexNumber?: number;
    // Playback
    UserData?: JellyfinUserData;
    MediaSources?: JellyfinMediaSource[];
    Container?: string;
    // Collections
    ChildCount?: number;
    RecursiveItemCount?: number;
}

export type JellyfinItemType =
    | 'Movie'
    | 'Series'
    | 'Season'
    | 'Episode'
    | 'MusicAlbum'
    | 'MusicArtist'
    | 'Audio'
    | 'BoxSet'
    | 'Folder'
    | 'CollectionFolder';

export interface JellyfinUserData {
    PlaybackPositionTicks: number;
    PlayCount: number;
    IsFavorite: boolean;
    Played: boolean;
    PlayedPercentage?: number;
    UnplayedItemCount?: number;
}

export interface JellyfinMediaSource {
    Id: string;
    Name: string;
    Path?: string;
    Container: string;
    Size?: number;
    Bitrate?: number;
    MediaStreams?: JellyfinMediaStream[];
    SupportsTranscoding: boolean;
    SupportsDirectStream: boolean;
    SupportsDirectPlay: boolean;
    TranscodingUrl?: string;
    DirectStreamUrl?: string;
}

export interface JellyfinMediaStream {
    Type: 'Video' | 'Audio' | 'Subtitle';
    Codec: string;
    Language?: string;
    Title?: string;
    DisplayTitle?: string;
    Index: number;
    IsDefault: boolean;
    IsExternal: boolean;
    Width?: number;
    Height?: number;
    BitRate?: number;
    Channels?: number;
    SampleRate?: number;
}

export interface JellyfinItemsResponse {
    Items: JellyfinItem[];
    TotalRecordCount: number;
    StartIndex: number;
}

export interface JellyfinSystemInfo {
    ServerName: string;
    Version: string;
    Id: string;
    OperatingSystem: string;
    HasUpdateAvailable: boolean;
}
