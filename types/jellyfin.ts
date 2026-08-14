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

// The spec marks essentially every BaseItemDto property — including Id, Name,
// ServerId, and Type below — as nullable. In practice every item this app
// fetches has them populated, and the UI accesses them directly (no `?.`
// guards) throughout, so they're kept required here rather than cascading
// optional-chaining into every consumer. Revisit if a real null is ever seen.
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
    Studios?: { Name: string; Id: string }[];
    People?: { Name: string; Id: string; Role?: string; Type: string; PrimaryImageTag?: string }[];
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

// Subset of the spec's BaseItemKind enum this app currently branches on,
// plus other values confirmed to come back from real libraries. Widened with
// `string & {}` (not a plain `string`) so unlisted BaseItemKind values still
// type-check instead of erroring, while known members keep autocomplete.
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
    | 'CollectionFolder'
    | 'Playlist'
    | 'Video'
    | 'Trailer'
    | 'MusicVideo'
    | 'Person'
    | 'Genre'
    | 'Recording'
    | 'PhotoAlbum'
    | 'Photo'
    | 'Book'
    | 'AudioBook'
    | 'LiveTvChannel'
    | 'TvChannel'
    | 'Program'
    | (string & {});

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
    TranscodingSubProtocol?: string;
    Protocol?: string;
    DefaultAudioStreamIndex?: number;
    DefaultSubtitleStreamIndex?: number;
}

export interface JellyfinMediaStream {
    Type: 'Audio' | 'Video' | 'Subtitle' | 'EmbeddedImage' | 'Data' | 'Lyric';
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

export type JellyfinPlayMethod = 'Transcode' | 'DirectStream' | 'DirectPlay';

export type JellyfinPlaybackErrorCode =
    | 'NotAllowed'
    | 'NoCompatibleStream'
    | 'RateLimitExceeded';

export interface JellyfinPlaybackInfoResponse {
    MediaSources: JellyfinMediaSource[];
    PlaySessionId: string;
    ErrorCode?: JellyfinPlaybackErrorCode;
}

/**
 * Response of GET /System/Info/Public — the spec's PublicSystemInfo schema.
 * `HasUpdateAvailable` lives only on the authenticated /System/Info response
 * and was never actually returned here; removed.
 */
export interface JellyfinSystemInfo {
    ServerName: string;
    Version: string;
    Id: string;
    /** @deprecated marked deprecated in the 10.11 spec, but still present on the response */
    OperatingSystem: string;
    LocalAddress?: string;
    ProductName?: string;
    StartupWizardCompleted?: boolean;
}
