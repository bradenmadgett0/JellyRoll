/**
 * Jellyfin — composed API client. Holds the shared root (auth, axios,
 * device ID) and exposes each API group as a namespaced sub-client
 * (media, ...) that shares the root's transport rather than extending it,
 * so new groups don't require picking an inheritance order.
 */

import {
    JellyfinAuthResponse,
    JellyfinSystemInfo,
    JellyfinUser,
} from "@/types/jellyfin";
import { ConnectionTestResult, ServerConfig } from "@/types/server";
import { JellyfinClient } from "./client";
import { JellyfinMediaClient } from "./media";

export class Jellyfin {
  private root: JellyfinClient;
  media: JellyfinMediaClient;

  constructor(server: ServerConfig) {
    this.root = new JellyfinClient(server);
    this.media = new JellyfinMediaClient(this.root);
  }

  get deviceId(): string {
    return this.root.deviceId;
  }

  authenticateByName(
    username: string,
    password: string,
  ): Promise<JellyfinAuthResponse> {
    return this.root.authenticateByName(username, password);
  }

  testConnection(): Promise<ConnectionTestResult> {
    return this.root.testConnection();
  }

  getSystemInfo(): Promise<JellyfinSystemInfo> {
    return this.root.getSystemInfo();
  }

  getCurrentUser(): Promise<JellyfinUser> {
    return this.root.getCurrentUser();
  }
}

export { generateDeviceId, JellyfinClient } from "./client";
