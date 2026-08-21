/**
 * useEffectiveScheme — the active theme's light/dark mode.
 *
 * For the few places that branch on mode itself (status bar style, React
 * Navigation's `dark` flag) rather than read a token.
 */

import { useTheme } from "./useTheme";

export function useEffectiveScheme(): "dark" | "light" {
  return useTheme().mode;
}
