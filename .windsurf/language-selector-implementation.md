# Language Selector Implementation

## Changes needed in playerOverlay.tsx:

1. Add `useMemo` to imports
2. Add `onLanguageChange?: (streamIndex: number) => void;` to PlayerOverlayProps
3. Add state variables:
   - `showLanguagePicker`
   - `selectedAudioIndex`
4. Update auto-hide dependency array to include `showLanguagePicker`
5. Add audio streams logic before return statement
6. Update bottom meta section to include language button
7. Add language picker modal after quality picker modal
8. Add styles for language controls

## Implementation details in separate files for clarity
