import MockAdapter from "axios-mock-adapter";
import { ServarrClient } from "./servarr";
import { makeServerConfig, noResponseReply } from "@/test/fixtures";

function makeClient(apiVersion?: string) {
  const server = makeServerConfig({ type: "sonarr", apiKey: "arr-key" });
  const client = new ServarrClient(server, apiVersion);
  const mock = new MockAdapter(client["client"]);
  return { client, mock, server };
}

describe("ServarrClient — construction", () => {
  it("defaults to the v3 API and sends the api key header", async () => {
    const { client, mock } = makeClient();
    let capturedKey: string | undefined;
    mock.onGet("/system/status").reply((config) => {
      capturedKey = config.headers?.["X-Api-Key"] as string | undefined;
      return [200, { appName: "Sonarr" }];
    });

    await client.getSystemStatus();

    expect(capturedKey).toBe("arr-key");
  });

  it("respects a custom api version in the base URL", async () => {
    const { client, mock, server } = makeClient("v1");
    mock.onGet("/system/status").reply((config) => {
      expect(config.baseURL).toBe(`${server.url}/api/v1`);
      return [200, {}];
    });
    await client.getSystemStatus();
  });
});

describe("ServarrClient — error mapping", () => {
  it("maps an HTTP error status to a status-coded message", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/system/status").reply(500, {}, {});
    await expect(client.getSystemStatus()).rejects.toThrow(
      /Servarr API error 500/,
    );
  });

  it("maps a network failure to a connectivity message", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/system/status").reply(noResponseReply);
    await expect(client.getSystemStatus()).rejects.toThrow(
      /No response from server/,
    );
  });
});

describe("ServarrClient — testConnection", () => {
  it("prefers instanceName over appName when present", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/system/status").reply(200, {
      appName: "Sonarr",
      instanceName: "My Sonarr",
      version: "4.0.0",
    });
    await expect(client.testConnection()).resolves.toEqual({
      success: true,
      serverName: "My Sonarr",
      serverVersion: "4.0.0",
    });
  });

  it("falls back to appName when instanceName is absent", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/system/status").reply(200, { appName: "Sonarr", version: "4.0.0" });
    const result = await client.testConnection();
    expect(result.serverName).toBe("Sonarr");
  });

  it("reports failure without throwing when the server errors", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/system/status").reply(500, {}, {});
    const result = await client.testConnection();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Servarr API error 500/);
  });
});

describe("ServarrClient — endpoint param shapes", () => {
  it("getQueue sends pagination and includeUnknownSeriesItems", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/queue").reply((config) => {
      expect(config.params).toEqual({
        page: 2,
        pageSize: 10,
        includeUnknownSeriesItems: true,
      });
      return [200, { records: [], totalRecords: 0 }];
    });
    await client.getQueue(2, 10);
  });

  it("getCalendar sends start/end and unmonitored=false", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/calendar").reply((config) => {
      expect(config.params).toEqual({
        start: "2026-01-01",
        end: "2026-01-08",
        unmonitored: false,
      });
      return [200, []];
    });
    await client.getCalendar("2026-01-01", "2026-01-08");
  });

  it("postCommand merges the command name with the given body", async () => {
    const { client, mock } = makeClient();
    mock.onPost("/command").reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        name: "RssSync",
        extra: true,
      });
      return [200, { id: 1, name: "RssSync" }];
    });
    await client.postCommand("RssSync", { extra: true });
  });
});
