import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { useServerStore } from "./serverStore";
import { makeServerConfig } from "@/test/fixtures";

const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const setItemAsync = SecureStore.setItemAsync as jest.Mock;

function makeServerInput(overrides: Parameters<typeof makeServerConfig>[0] = {}) {
  const { id, sortOrder, ...rest } = makeServerConfig(overrides);
  return rest;
}

function resetStore() {
  useServerStore.setState({ servers: [], isLoaded: false });
}

beforeEach(() => {
  Platform.OS = "ios";
  getItemAsync.mockReset().mockResolvedValue(null);
  setItemAsync.mockReset().mockResolvedValue(undefined);
  resetStore();
});

describe("useServerStore — loadServers", () => {
  it("hydrates servers from SecureStore", async () => {
    const server = makeServerConfig();
    getItemAsync.mockResolvedValue(JSON.stringify([server]));

    await useServerStore.getState().loadServers();

    expect(useServerStore.getState()).toMatchObject({
      servers: [server],
      isLoaded: true,
    });
  });

  it("defaults to an empty list when nothing is stored", async () => {
    await useServerStore.getState().loadServers();
    expect(useServerStore.getState()).toMatchObject({ servers: [], isLoaded: true });
  });

  it("defaults to an empty list (without throwing) when SecureStore errors", async () => {
    getItemAsync.mockRejectedValue(new Error("keychain unavailable"));
    await useServerStore.getState().loadServers();
    expect(useServerStore.getState()).toMatchObject({ servers: [], isLoaded: true });
  });
});

describe("useServerStore — addServer", () => {
  it("assigns an id and the next sortOrder, then persists and returns the id", async () => {
    const id = await useServerStore.getState().addServer({
      name: "My Server",
      type: "jellyfin",
      url: "http://a.local",
      isHttps: false,
      httpAllowed: true,
    });

    const servers = useServerStore.getState().servers;
    expect(servers).toHaveLength(1);
    expect(servers[0]).toMatchObject({ id, name: "My Server", sortOrder: 0 });
    expect(setItemAsync).toHaveBeenCalledWith(
      "jellyroll_servers",
      JSON.stringify(servers),
    );
  });

  it("increments sortOrder for each additional server", async () => {
    await useServerStore.getState().addServer({
      name: "First",
      type: "jellyfin",
      url: "http://a.local",
      isHttps: false,
      httpAllowed: true,
    });
    await useServerStore.getState().addServer({
      name: "Second",
      type: "radarr",
      url: "http://b.local",
      isHttps: false,
      httpAllowed: true,
    });

    const servers = useServerStore.getState().servers;
    expect(servers.map((s) => s.sortOrder)).toEqual([0, 1]);
  });

  it("rejects with a friendly error when SecureStore write fails, without updating state", async () => {
    setItemAsync.mockRejectedValue(new Error("disk full"));

    await expect(
      useServerStore.getState().addServer({
        name: "My Server",
        type: "jellyfin",
        url: "http://a.local",
        isHttps: false,
        httpAllowed: true,
      }),
    ).rejects.toThrow(/Failed to save server configuration securely/);

    expect(useServerStore.getState().servers).toEqual([]);
  });
});

describe("useServerStore — updateServer / removeServer", () => {
  it("updateServer merges a patch into only the matching server", async () => {
    const idA = await useServerStore.getState().addServer(
      makeServerInput({ name: "A" }),
    );
    const idB = await useServerStore.getState().addServer(
      makeServerInput({ name: "B" }),
    );

    await useServerStore.getState().updateServer(idA, { name: "A renamed" });

    const servers = useServerStore.getState().servers;
    expect(servers.find((s) => s.id === idA)?.name).toBe("A renamed");
    expect(servers.find((s) => s.id === idB)?.name).toBe("B");
  });

  it("removeServer drops only the targeted server", async () => {
    const idA = await useServerStore.getState().addServer(
      makeServerInput({ name: "A" }),
    );
    const idB = await useServerStore.getState().addServer(
      makeServerInput({ name: "B" }),
    );

    await useServerStore.getState().removeServer(idA);

    const servers = useServerStore.getState().servers;
    expect(servers.map((s) => s.id)).toEqual([idB]);
  });
});

describe("useServerStore — getServersByType / getServer", () => {
  it("filters by type and looks up by id", async () => {
    const jellyfinId = await useServerStore
      .getState()
      .addServer(makeServerInput({ type: "jellyfin" }));
    await useServerStore.getState().addServer(makeServerInput({ type: "radarr" }));

    expect(useServerStore.getState().getServersByType("jellyfin")).toHaveLength(1);
    expect(useServerStore.getState().getServer(jellyfinId)?.type).toBe("jellyfin");
    expect(useServerStore.getState().getServer("missing")).toBeUndefined();
  });
});

describe("useServerStore — reorderServers", () => {
  it("reassigns sortOrder to match the given id order", async () => {
    const idA = await useServerStore.getState().addServer(
      makeServerInput({ name: "A" }),
    );
    const idB = await useServerStore.getState().addServer(
      makeServerInput({ name: "B" }),
    );

    await useServerStore.getState().reorderServers([idB, idA]);

    const servers = useServerStore.getState().servers;
    expect(servers.map((s) => s.id)).toEqual([idB, idA]);
    expect(servers.map((s) => s.sortOrder)).toEqual([0, 1]);
  });

  it("silently drops ids that no longer exist", async () => {
    const idA = await useServerStore.getState().addServer(
      makeServerInput({ name: "A" }),
    );

    await useServerStore.getState().reorderServers([idA, "ghost-id"]);

    expect(useServerStore.getState().servers.map((s) => s.id)).toEqual([idA]);
  });
});

describe("useServerStore — web platform fallback", () => {
  const store: Record<string, string> = {};
  const localStorageMock = {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
  };

  beforeEach(() => {
    Platform.OS = "web";
    Object.keys(store).forEach((k) => delete store[k]);
    (global as any).localStorage = localStorageMock;
  });

  afterEach(() => {
    delete (global as any).localStorage;
  });

  it("persists to and reads from localStorage instead of SecureStore", async () => {
    await useServerStore.getState().addServer({
      name: "Web Server",
      type: "jellyfin",
      url: "http://a.local",
      isHttps: false,
      httpAllowed: true,
    });

    expect(setItemAsync).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).toHaveBeenCalled();

    resetStore();
    await useServerStore.getState().loadServers();
    expect(useServerStore.getState().servers).toHaveLength(1);
  });
});
