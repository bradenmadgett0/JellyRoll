import MockAdapter from "axios-mock-adapter";
import { generateDeviceId, JellyfinClient } from "./client";
import { useServerStore } from "@/services/stores/serverStore";
import { makeServerConfig, noResponseReply } from "@/test/fixtures";

jest.mock("@/services/stores/serverStore", () => ({
  useServerStore: { getState: jest.fn() },
}));

describe("generateDeviceId", () => {
  it("is prefixed and unique per call", () => {
    const a = generateDeviceId();
    const b = generateDeviceId();
    expect(a).toMatch(/^jellyroll_/);
    expect(b).toMatch(/^jellyroll_/);
    expect(a).not.toBe(b);
  });
});

describe("JellyfinClient — device id resolution", () => {
  const updateServer = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    updateServer.mockClear();
    (useServerStore.getState as jest.Mock).mockReturnValue({ updateServer });
  });

  it("reuses an existing deviceId without touching the store", () => {
    const server = makeServerConfig({ deviceId: "existing-device-id" });
    const client = new JellyfinClient(server);
    expect(client.deviceId).toBe("existing-device-id");
    expect(updateServer).not.toHaveBeenCalled();
  });

  it("backfills and persists a new deviceId when one is missing", () => {
    const server = makeServerConfig({ deviceId: undefined });
    const client = new JellyfinClient(server);
    expect(client.deviceId).toMatch(/^jellyroll_/);
    expect(updateServer).toHaveBeenCalledWith(server.id, {
      deviceId: client.deviceId,
    });
  });
});

describe("JellyfinClient — request auth header", () => {
  beforeEach(() => {
    (useServerStore.getState as jest.Mock).mockReturnValue({
      updateServer: jest.fn().mockResolvedValue(undefined),
    });
  });

  it("includes a Token param when accessToken is set", async () => {
    const server = makeServerConfig({ accessToken: "secret-token" });
    const client = new JellyfinClient(server);
    const mock = new MockAdapter(client.client);
    let capturedAuth: string | undefined;
    mock.onGet("/System/Info/Public").reply((config) => {
      capturedAuth = config.headers?.Authorization as string | undefined;
      return [200, { ServerName: "S", Version: "1" }];
    });

    await client.getSystemInfo();

    expect(capturedAuth).toContain('Client="JellyRoll"');
    expect(capturedAuth).toContain(`DeviceId="${client.deviceId}"`);
    expect(capturedAuth).toContain('Token="secret-token"');
  });

  it("omits the Token param when there is no accessToken", async () => {
    const server = makeServerConfig({ accessToken: undefined });
    const client = new JellyfinClient(server);
    const mock = new MockAdapter(client.client);
    let capturedAuth: string | undefined;
    mock.onGet("/System/Info/Public").reply((config) => {
      capturedAuth = config.headers?.Authorization as string | undefined;
      return [200, { ServerName: "S", Version: "1" }];
    });

    await client.getSystemInfo();

    expect(capturedAuth).not.toContain("Token=");
  });
});

describe("JellyfinClient — error mapping", () => {
  let client: JellyfinClient;
  let mock: MockAdapter;

  beforeEach(() => {
    (useServerStore.getState as jest.Mock).mockReturnValue({
      updateServer: jest.fn().mockResolvedValue(undefined),
    });
    client = new JellyfinClient(makeServerConfig());
    mock = new MockAdapter(client.client);
  });

  it("maps a 401 to a re-auth prompt", async () => {
    mock.onGet("/System/Info/Public").reply(401);
    await expect(client.getSystemInfo()).rejects.toThrow(
      /Authentication failed/,
    );
  });

  it("maps other HTTP error statuses to a status-coded message", async () => {
    mock.onGet("/System/Info/Public").reply(500, {}, {});
    await expect(client.getSystemInfo()).rejects.toThrow(
      /Jellyfin error 500/,
    );
  });

  it("maps a network failure (no response) to a connectivity message", async () => {
    mock.onGet("/System/Info/Public").reply(noResponseReply);
    await expect(client.getSystemInfo()).rejects.toThrow(
      /No response from Jellyfin server/,
    );
  });
});

describe("JellyfinClient — testConnection", () => {
  beforeEach(() => {
    (useServerStore.getState as jest.Mock).mockReturnValue({
      updateServer: jest.fn().mockResolvedValue(undefined),
    });
  });

  it("reports success with server name/version on a healthy server", async () => {
    const client = new JellyfinClient(makeServerConfig());
    const mock = new MockAdapter(client.client);
    mock
      .onGet("/System/Info/Public")
      .reply(200, { ServerName: "Home Server", Version: "10.11.3" });

    await expect(client.testConnection()).resolves.toEqual({
      success: true,
      serverName: "Home Server",
      serverVersion: "10.11.3",
    });
  });

  it("reports failure with the mapped error message when unreachable", async () => {
    const client = new JellyfinClient(makeServerConfig());
    const mock = new MockAdapter(client.client);
    mock.onGet("/System/Info/Public").reply(noResponseReply);

    const result = await client.testConnection();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No response from Jellyfin server/);
  });
});
