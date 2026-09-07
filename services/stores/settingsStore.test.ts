import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSettingsStore } from "./settingsStore";

const SETTINGS_KEY = "jellyroll_settings";

const DEFAULTS = {
  mediaViewMode: "grid" as const,
  streamQuality: "auto" as const,
  autoRefreshInterval: 30,
  showSubtitles: true,
  enableNotifications: true,
};

function resetStore() {
  useSettingsStore.setState({ ...DEFAULTS, isLoaded: false });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  resetStore();
});

describe("useSettingsStore — loadSettings", () => {
  it("keeps defaults and marks isLoaded when nothing is persisted", async () => {
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState()).toMatchObject({ ...DEFAULTS, isLoaded: true });
  });

  it("hydrates from a persisted (possibly partial) blob, defaulting missing fields", async () => {
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ mediaViewMode: "list", showSubtitles: false }),
    );

    await useSettingsStore.getState().loadSettings();

    expect(useSettingsStore.getState()).toMatchObject({
      mediaViewMode: "list",
      showSubtitles: false,
      streamQuality: "auto",
      autoRefreshInterval: 30,
      enableNotifications: true,
      isLoaded: true,
    });
  });

  it("still marks isLoaded true when the persisted blob is corrupt", async () => {
    await AsyncStorage.setItem(SETTINGS_KEY, "{not json");
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().isLoaded).toBe(true);
  });
});

describe("useSettingsStore — setters", () => {
  it.each([
    ["setMediaViewMode", "list", "mediaViewMode"],
    ["setStreamQuality", "1080p", "streamQuality"],
    ["setAutoRefreshInterval", 60, "autoRefreshInterval"],
    ["setShowSubtitles", false, "showSubtitles"],
    ["setEnableNotifications", false, "enableNotifications"],
  ] as const)("%s updates state and persists it", async (action, value, key) => {
    await (useSettingsStore.getState() as any)[action](value);

    expect((useSettingsStore.getState() as any)[key]).toBe(value);

    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    expect(JSON.parse(raw!)[key]).toBe(value);
  });

  it("persisted blob only contains the known settings fields", async () => {
    await useSettingsStore.getState().setMediaViewMode("list");
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    expect(Object.keys(JSON.parse(raw!)).sort()).toEqual(
      [
        "mediaViewMode",
        "streamQuality",
        "autoRefreshInterval",
        "showSubtitles",
        "enableNotifications",
      ].sort(),
    );
  });
});
