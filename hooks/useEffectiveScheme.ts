/**
 * useEffectiveScheme — Resolves the effective color scheme
 *
 * Reads the user's theme preference from the settings store ('dark', 'light', 'system')
 * and resolves 'system' to the actual device color scheme via useColorScheme().
 *
 * Returns 'dark' or 'light'.
 */

import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../services/stores/settingsStore';

export function useEffectiveScheme(): 'dark' | 'light' {
    const themePref = useSettingsStore((s) => s.theme);
    const deviceScheme = useColorScheme();

    if (themePref === 'system') {
        return deviceScheme ?? 'dark';
    }
    return themePref;
}
