/**
 * useMediaSettings — Per-media stream settings hook.
 * Binds the media settings store to a specific itemId + the active
 * Jellyfin server so consumers don't need to wire that up themselves.
 */

import { useCallback } from "react";
import { useMediaSettingsStore } from "../stores/mediaSettingsStore";
import { useServerStore } from "../stores/serverStore";

type MediaSettingsPatch = Parameters<
  ReturnType<typeof useMediaSettingsStore.getState>["setSettings"]
>[2];

export function useMediaSettings(itemId: string) {
  const jellyfinServer = useServerStore(
    (s) => s.getServersByType("jellyfin")[0],
  );
  const getSettings = useMediaSettingsStore((s) => s.getSettings);
  const setSettings = useMediaSettingsStore((s) => s.setSettings);

  const serverId = jellyfinServer?.id;

  const get = useCallback(() => {
    if (!serverId) return undefined;
    return getSettings(serverId, itemId);
  }, [serverId, itemId, getSettings]);

  const set = useCallback(
    (patch: MediaSettingsPatch) => {
      if (!serverId) return;
      setSettings(serverId, itemId, patch);
    },
    [serverId, itemId, setSettings],
  );

  return { get, set, serverId };
}
