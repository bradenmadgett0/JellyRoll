import { ServerConfig } from "@/types/server";
import type { AxiosRequestConfig } from "axios";

/**
 * axios-mock-adapter's own `networkError()` sets the resulting AxiosError's
 * `request` to `null` (falsy), which doesn't reproduce a real "request sent,
 * no response received" axios error (where `request` is a truthy XHR/
 * ClientRequest object). Use this reply instead when testing an app's
 * `error.request`-without-`error.response` branch.
 */
export function noResponseReply(config: AxiosRequestConfig): never {
  const error = new Error("Network Error") as Error & {
    isAxiosError: boolean;
    config: AxiosRequestConfig;
    request: unknown;
  };
  error.isAxiosError = true;
  error.config = config;
  error.request = {};
  throw error;
}

export function makeServerConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    id: "server-1",
    name: "Test Server",
    type: "jellyfin",
    url: "http://jellyfin.local:8096",
    isHttps: false,
    httpAllowed: true,
    sortOrder: 0,
    accessToken: "test-access-token",
    userId: "test-user-id",
    deviceId: "jellyroll_fixture",
    apiKey: "test-api-key",
    ...overrides,
  };
}
