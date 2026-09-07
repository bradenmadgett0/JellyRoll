import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeStore } from "./themeStore";
import { DEFAULT_THEME_ID } from "@/constants/theme";

const THEME_KEY = "jellyroll_theme";

function resetStore() {
  useThemeStore.setState({ activeThemeId: DEFAULT_THEME_ID, isLoaded: false });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  resetStore();
});

describe("useThemeStore — loadThemes", () => {
  it("defaults to DEFAULT_THEME_ID when nothing is persisted", async () => {
    await useThemeStore.getState().loadThemes();
    expect(useThemeStore.getState()).toMatchObject({
      activeThemeId: DEFAULT_THEME_ID,
      isLoaded: true,
    });
  });

  it("restores a persisted theme id", async () => {
    await AsyncStorage.setItem(THEME_KEY, JSON.stringify({ activeThemeId: "light" }));
    await useThemeStore.getState().loadThemes();
    expect(useThemeStore.getState().activeThemeId).toBe("light");
  });

  it("falls back to the default without crashing on a corrupt blob", async () => {
    await AsyncStorage.setItem(THEME_KEY, "{not json");
    await useThemeStore.getState().loadThemes();
    expect(useThemeStore.getState()).toMatchObject({
      activeThemeId: DEFAULT_THEME_ID,
      isLoaded: true,
    });
  });
});

describe("useThemeStore — setActiveTheme", () => {
  it("updates state and persists the new theme id", async () => {
    await useThemeStore.getState().setActiveTheme("light");

    expect(useThemeStore.getState().activeThemeId).toBe("light");
    const raw = await AsyncStorage.getItem(THEME_KEY);
    expect(JSON.parse(raw!)).toEqual({ activeThemeId: "light" });
  });
});
