/**
 * Jellyfin API Client
 * Handles authentication, library browsing, and media streaming
 */

import axios, { AxiosInstance } from "axios";
import {
    JellyfinAuthResponse,
    JellyfinSystemInfo,
} from "../../../types/jellyfin";
import { ConnectionTestResult, ServerConfig } from "../../../types/server";
import { useServerStore } from "../../stores/serverStore";

const CLIENT_NAME = "JellyRoll";
const CLIENT_VERSION = "1.0.0";
const DEVICE_NAME = "JellyRoll Mobile";

export function generateDeviceId(): string {
  return "jellyroll_" + Math.random().toString(36).substring(2, 15);
}

/**
 * Resolve the stable device ID for a server, backfilling and persisting one
 * for installs that predate the deviceId field. Without a stable ID, Jellyfin
 * registers a new session/device per request.
 */
function resolveDeviceId(server: ServerConfig): string {
  if (server.deviceId) return server.deviceId;
  const deviceId = generateDeviceId();
  useServerStore
    .getState()
    .updateServer(server.id, { deviceId })
    .catch((e) => console.warn("[Jellyfin] Failed to persist device ID", e));
  return deviceId;
}

export class JellyfinClient {
  public client: AxiosInstance;
  public server: ServerConfig;
  public deviceId: string;

  getDeviceId(): string {
    return this.deviceId;
  }

  constructor(server: ServerConfig) {
    this.server = server;
    this.deviceId = resolveDeviceId(server);

    this.client = axios.create({
      baseURL: server.url,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth header to all requests
    this.client.interceptors.request.use((config) => {
      const params = [
        `Client="${CLIENT_NAME}"`,
        `Device="${DEVICE_NAME}"`,
        `DeviceId="${this.deviceId}"`,
        `Version="${CLIENT_VERSION}"`,
      ];
      if (this.server.accessToken) {
        params.push(`Token="${this.server.accessToken}"`);
      }
      config.headers["Authorization"] = `MediaBrowser ${params.join(", ")}`;
      return config;
    });

    // Error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new Error(
            "Authentication failed. Please re-enter your credentials.",
          );
        }
        if (error.response) {
          throw new Error(
            `Jellyfin error ${error.response.status}: ${error.response.statusText}`,
          );
        }
        if (error.request) {
          throw new Error(
            "No response from Jellyfin server. Check your connection.",
          );
        }
        throw error;
      },
    );
  }

  // ─── Authentication ──────────────────────────────────

  async authenticateByName(
    username: string,
    password: string,
  ): Promise<JellyfinAuthResponse> {
    const { data } = await this.client.post("/Users/AuthenticateByName", {
      Username: username,
      Pw: password,
    });
    return data;
  }

  /** Test connection (unauthenticated — just checks server is reachable) */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const info = await this.getSystemInfo();
      return {
        success: true,
        serverName: info.ServerName,
        serverVersion: info.Version,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ─── System ──────────────────────────────────────────

  async getSystemInfo(): Promise<JellyfinSystemInfo> {
    const { data } = await this.client.get("/System/Info/Public");
    return data;
  }
}
