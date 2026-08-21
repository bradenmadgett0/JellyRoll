/**
 * Theme Store — which theme is active.
 *
 * `activeThemeId` is a theme id or the literal 'system' to follow the device.
 *
 * User-created themes are deliberately not modelled yet — see the note in
 * `constants/theme/tokens.ts`.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { DEFAULT_THEME_ID } from "../../constants/theme";

const THEME_KEY = "jellyroll_theme";

export const SYSTEM_THEME = "system";

interface ThemeState {
  activeThemeId: string;
  isLoaded: boolean;

  loadThemes: () => Promise<void>;
  setActiveTheme: (themeId: string) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  activeThemeId: DEFAULT_THEME_ID,
  isLoaded: false,

  loadThemes: async () => {
    try {
      const raw = await AsyncStorage.getItem(THEME_KEY);
      const saved = raw ? (JSON.parse(raw) as { activeThemeId?: string }) : null;
      set({
        activeThemeId: saved?.activeThemeId ?? DEFAULT_THEME_ID,
        isLoaded: true,
      });
    } catch {
      // A corrupt blob shouldn't block startup — this runs inside the
      // Promise.all that gates the splash screen in app/_layout.tsx.
      set({ isLoaded: true });
    }
  },

  setActiveTheme: async (themeId) => {
    set({ activeThemeId: themeId });
    await AsyncStorage.setItem(
      THEME_KEY,
      JSON.stringify({ activeThemeId: themeId }),
    );
  },
}));
