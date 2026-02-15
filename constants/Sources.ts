/**
 * Source Service Definitions — Shared config for service colors, icons, and labels
 * Used across search, queue cards, and any component displaying service badges
 */

import { Ionicons } from '@expo/vector-icons';
import { Colors } from './Colors';

/** Brand color for each service source */
export const SOURCE_COLORS: Record<string, string> = {
    jellyfin: Colors.jellyfin,
    sonarr: Colors.sonarr,
    radarr: Colors.radarr,
    lidarr: Colors.lidarr,
};

/** Icon glyph for each service source */
export const SOURCE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    jellyfin: 'play-circle',
    sonarr: 'tv',
    radarr: 'film',
    lidarr: 'musical-notes',
};

/** Human-readable label for each service source */
export const SOURCE_LABELS: Record<string, string> = {
    jellyfin: 'Jellyfin',
    sonarr: 'Sonarr',
    radarr: 'Radarr',
    lidarr: 'Lidarr',
};
