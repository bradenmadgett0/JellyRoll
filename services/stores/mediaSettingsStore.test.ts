import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMediaSettingsStore } from "./mediaSettingsStore";

const STORAGE_KEY = "jellyroll_media_settings";

function resetStore() {
  useMediaSettingsStore.setState({ settings: {}, isLoaded: false });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  resetStore();
});

describe("useMediaSettingsStore — loadSettings", () => {
  it("marks isLoaded true with empty settings when nothing is persisted", async () => {
    await useMediaSettingsStore.getState().loadSettings();
    expect(useMediaSettingsStore.getState()).toMatchObject({
      isLoaded: true,
      settings: {},
    });
  });

  it("hydrates settings from AsyncStorage", async () => {
    const stored = { "server-1:item-1": { qualityPreset: "1080p", lastUpdated: "x" } };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    await useMediaSettingsStore.getState().loadSettings();

    expect(useMediaSettingsStore.getState().settings).toEqual(stored);
    expect(useMediaSettingsStore.getState().isLoaded).toBe(true);
  });

  it("still marks isLoaded true when the persisted blob is corrupt", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "not json");
    await useMediaSettingsStore.getState().loadSettings();
    expect(useMediaSettingsStore.getState().isLoaded).toBe(true);
  });
});

describe("useMediaSettingsStore — setSettings / getSettings", () => {
  it("keys settings by serverId:itemId and merges patches", async () => {
    await useMediaSettingsStore
      .getState()
      .setSettings("server-1", "item-1", { qualityPreset: "1080p" });
    await useMediaSettingsStore
      .getState()
      .setSettings("server-1", "item-1", { audioStreamIndex: 2 });

    const settings = useMediaSettingsStore.getState().getSettings("server-1", "item-1");
    expect(settings).toMatchObject({ qualityPreset: "1080p", audioStreamIndex: 2 });
  });

  it("does not leak settings across different serverId/itemId keys", async () => {
    await useMediaSettingsStore
      .getState()
      .setSettings("server-1", "item-1", { qualityPreset: "1080p" });

    expect(
      useMediaSettingsStore.getState().getSettings("server-2", "item-1"),
    ).toBeUndefined();
    expect(
      useMediaSettingsStore.getState().getSettings("server-1", "item-2"),
    ).toBeUndefined();
  });

  it("persists every write to AsyncStorage", async () => {
    await useMediaSettingsStore
      .getState()
      .setSettings("server-1", "item-1", { qualityPreset: "720p" });

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw!)["server-1:item-1"]).toMatchObject({
      qualityPreset: "720p",
    });
  });
});

describe("useMediaSettingsStore — deleteSettings / clearAllSettings", () => {
  it("deleteSettings removes only the targeted key", async () => {
    await useMediaSettingsStore
      .getState()
      .setSettings("server-1", "item-1", { qualityPreset: "1080p" });
    await useMediaSettingsStore
      .getState()
      .setSettings("server-1", "item-2", { qualityPreset: "720p" });

    await useMediaSettingsStore.getState().deleteSettings("server-1", "item-1");

    expect(
      useMediaSettingsStore.getState().getSettings("server-1", "item-1"),
    ).toBeUndefined();
    expect(
      useMediaSettingsStore.getState().getSettings("server-1", "item-2"),
    ).toBeDefined();
  });

  it("clearAllSettings empties both state and AsyncStorage", async () => {
    await useMediaSettingsStore
      .getState()
      .setSettings("server-1", "item-1", { qualityPreset: "1080p" });

    await useMediaSettingsStore.getState().clearAllSettings();

    expect(useMediaSettingsStore.getState().settings).toEqual({});
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
