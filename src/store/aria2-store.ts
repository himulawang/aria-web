import { createStore } from "solid-js/store";
import { Aria2Client } from "../core/aria2-client";
import type { Aria2Config } from "../core/types";
import { StorageService } from "../core/storage";
import { storageDB } from "../core/storage-db";
import { logger } from "../core/logger";
import { notificationStore } from "./notification-store";
import { DEFAULT_APP_SETTINGS } from "../config/app-settings";
import type { AppSettings } from "../config/app-settings";

interface GlobalStat {
  activeDownloads: number;
  completedDownloads: number;
  downloadSpeed: number;
  uploadSpeed: number;
  downloadedSize: string;
  uploadedSize: string;
  totalDownloadPlan: string;
  totalUploadPlan: string;
}

interface RpcProfile {
  id: string;
  name: string;
  config: Aria2Config;
}

interface Aria2State {
  rpcProfiles: RpcProfile[];
  currentProfileId: string | null;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  tasks: any[];
  selectedTaskId: string | null;
  selectedTaskDetail: any | null;
  globalStat: GlobalStat | null;
  isDownloading: boolean;
  appSettings: AppSettings;
  initialFetchDone: boolean;
}

const DEFAULT_CONFIG: Aria2Config = {
  url: "ws://192.168.68.58:6800/jsonrpc",
  token: "123",
  useWebSocket: true,
  httpMethod: "POST",
  wsReconnectInterval: 5000,
};

const [state, setState] = createStore<Aria2State>({
  rpcProfiles: [],
  currentProfileId: null,
  connectionStatus: "disconnected",
  tasks: [],
  selectedTaskId: null,
  selectedTaskDetail: null,
  globalStat: null,
  isDownloading: false,
  appSettings: DEFAULT_APP_SETTINGS,
  initialFetchDone: false,
});

let client: Aria2Client | null = null;
let pollingTimer: any = null;
// GIDs that should be hidden from the task list (e.g. ED2K search tasks)
const hiddenGids = new Set<string>();
// Guard to prevent duplicate event listener registration
let listenersSetup = false;

const LOG_CONTEXT = "aria2Store";

export const aria2Store = {
  getState: () => state,

  async init() {
    logger.info("Initializing store from IndexedDB...", LOG_CONTEXT);

    // Load App Settings
    const savedSettings = await storageDB.get<AppSettings>("app_settings");
    if (savedSettings) {
      setState("appSettings", savedSettings);
    }

    // Load RPC Profiles
    const savedProfiles = await storageDB.get<RpcProfile[]>("rpc_profiles");
    if (savedProfiles && savedProfiles.length > 0) {
      setState("rpcProfiles", savedProfiles);
      const savedProfileId = await storageDB.get<string>("current_profile_id");
      if (savedProfileId) {
        setState("currentProfileId", savedProfileId);
      }
    } else {
      // Default profile if none exists
      const defaultProfile: RpcProfile = {
        id: "default",
        name: "Default",
        config:
          StorageService.get<Aria2Config>("aria2_config") || DEFAULT_CONFIG,
      };
      setState("rpcProfiles", [defaultProfile]);
      setState("currentProfileId", "default");
    }

    try {
      await this.connect();
    } catch (e) {
      logger.warn(
        "Auto-connect failed. User may need to connect manually.",
        LOG_CONTEXT,
      );
    }
  },

  async executeCustomRpc(method: string, params: any[]) {
    if (!client) await this.connect();
    try {
      return await client!.request(method, params);
    } catch (e) {
      logger.error(`Custom RPC ${method} failed: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async updateAppSettings(newSettings: Partial<AppSettings>) {
    const updated = { ...state.appSettings, ...newSettings };
    setState("appSettings", updated);
    await storageDB.set("app_settings", updated);
  },

  async addProfile(profile: RpcProfile) {
    const updatedProfiles = [...state.rpcProfiles, profile];
    setState("rpcProfiles", updatedProfiles);
    await storageDB.set("rpc_profiles", updatedProfiles);
  },

  async removeProfile(id: string) {
    const updatedProfiles = state.rpcProfiles.filter((p) => p.id !== id);
    setState("rpcProfiles", updatedProfiles);
    await storageDB.set("rpc_profiles", updatedProfiles);

    if (state.currentProfileId === id) {
      const nextId = updatedProfiles.length > 0 ? updatedProfiles[0].id : null;
      await this.setCurrentProfile(nextId);
    }
  },

  async updateProfile(id: string, updates: Partial<RpcProfile>) {
    const updatedProfiles = state.rpcProfiles.map((p) =>
      p.id === id ? { ...p, ...updates } : p,
    );
    setState("rpcProfiles", updatedProfiles);
    await storageDB.set("rpc_profiles", updatedProfiles);

    if (state.currentProfileId === id) {
      const profile = updatedProfiles.find((p) => p.id === id);
      if (profile) {
        this.stopPolling();
        client = new Aria2Client(profile.config);
        await this.connect();
      }
    }
  },

  async setCurrentProfile(id: string | null) {
    setState("currentProfileId", id);
    if (id) {
      await storageDB.set("current_profile_id", id);
      await this.connect();
    } else {
      await storageDB.remove("current_profile_id");
      this.disconnect();
    }
  },

  async exportSettings() {
    const exportData = {
      appSettings: state.appSettings,
      rpcProfiles: state.rpcProfiles,
      currentProfileId: state.currentProfileId,
    };
    return JSON.stringify(exportData, null, 2);
  },

  async importSettings(json: string) {
    try {
      const data = JSON.parse(json);
      if (data.appSettings) {
        await this.updateAppSettings(data.appSettings);
      }
      if (data.rpcProfiles) {
        setState("rpcProfiles", data.rpcProfiles);
        await storageDB.set("rpc_profiles", data.rpcProfiles);
      }
      if (data.currentProfileId) {
        await this.setCurrentProfile(data.currentProfileId);
      }
      notificationStore.add("Settings imported successfully", "success");
    } catch (e) {
      notificationStore.add("Failed to import settings: Invalid JSON", "error");
      throw e;
    }
  },

  async updateConfig(newConfig: Partial<Aria2Config>) {
    const profileId = state.currentProfileId;
    if (!profileId) return;

    const profile = state.rpcProfiles.find((p) => p.id === profileId);
    if (!profile) return;

    const updatedConfig = { ...profile.config, ...newConfig };

    // Update state
    setState("rpcProfiles", (prev) =>
      prev.map((p) =>
        p.id === profileId ? { ...p, config: updatedConfig } : p,
      ),
    );

    // Persist to IndexedDB
    await storageDB.set("rpc_profiles", state.rpcProfiles); // Note: state update is reactive but might be async
    // Better to use the newly calculated list
    const allProfiles = state.rpcProfiles.map((p) =>
      p.id === profileId ? { ...p, config: updatedConfig } : p,
    );
    await storageDB.set("rpc_profiles", allProfiles);

    this.stopPolling();
    client = new Aria2Client(updatedConfig);
  },

  async connect() {
    const profile = state.rpcProfiles.find(
      (p) => p.id === state.currentProfileId,
    );
    const config = profile ? profile.config : DEFAULT_CONFIG;

    if (!client) {
      client = new Aria2Client(config);
    }

    setState("connectionStatus", "connecting");
    try {
      await client.connect();
      setState("connectionStatus", "connected");

      this.startPolling();
      this.setupEventListeners();
    } catch (e) {
      logger.error(`Connection failed: ${e}`, LOG_CONTEXT);
      setState("connectionStatus", "error");
      throw e;
    }
  },

  async disconnect() {
    this.stopPolling();
    listenersSetup = false;
    if (client) {
      await client.disconnect();
    }
    setState("connectionStatus", "disconnected");
    setState("initialFetchDone", false);
  },

  async fetchActiveTasks() {
    if (!client) await this.connect();
    try {
      const active = await client!.request<any[]>("aria2.tellActive", []);
      logger.debug("Fetched active tasks", LOG_CONTEXT);
      setState("tasks", (prev) => {
        const activeGids = new Set(active.map((t) => t.gid));
        return [...active, ...prev.filter((t) => !activeGids.has(t.gid))];
      });
    } catch (e) {
      logger.error(`Failed to fetch active tasks: ${e}`, LOG_CONTEXT);
    }
  },

  async updateActiveTasksOnly() {
    if (!client) await this.connect();
    try {
      const [active, stat] = await Promise.all([
        client!.request<any[]>("aria2.tellActive", []),
        client!.request<GlobalStat>("aria2.getGlobalStat"),
      ]);

      setState("globalStat", stat);

      const activeTasks = active.filter(
        (task) =>
          task &&
          typeof task === "object" &&
          "gid" in task &&
          !hiddenGids.has(task.gid),
      );

      const activeGids = new Set(activeTasks.map((t) => t.gid));

      let needsFullSync = false;
      for (const task of state.tasks) {
        if (task.status === "active" && !activeGids.has(task.gid)) {
          needsFullSync = true;
          break;
        }
      }

      if (needsFullSync) {
        logger.info("Active task list changed. Triggering full sync...", LOG_CONTEXT);
        await this.fetchTasks();
        return;
      }

      setState("tasks", (prev) => {
        const next = [...prev];
        activeTasks.forEach((incoming) => {
          const index = next.findIndex((t) => t.gid === incoming.gid);
          if (index !== -1) {
            next[index] = { ...next[index], ...incoming };
          } else {
            next.unshift(incoming);
          }
        });
        return next;
      });
    } catch (e) {
      logger.error(`Failed to update active tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async fetchTasks() {
    if (!client) await this.connect();
    try {
      const [active, waiting, stopped] = await Promise.all([
        client!.request<any[]>("aria2.tellActive", []),
        client!.request<any[]>("aria2.tellWaiting", [0, 1000]),
        client!.request<any[]>("aria2.tellStopped", [0, 1000]),
      ]);

      const allTasks = [...active, ...waiting, ...stopped].filter(
        (task) =>
          task &&
          typeof task === "object" &&
          "gid" in task &&
          !hiddenGids.has(task.gid), // filter out hidden GIDs (e.g. ED2K search tasks)
      );

      setState("tasks", allTasks);
      setState("initialFetchDone", true);
    } catch (e) {
      logger.error(`Failed to fetch tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async fetchGlobalStat() {
    if (!client) await this.connect();
    try {
      const stat = await client!.request<GlobalStat>("aria2.getGlobalStat");
      logger.debug("Fetched global stat", LOG_CONTEXT);
      setState("globalStat", stat);
    } catch (e) {
      logger.error(`Failed to fetch global stat: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async fetchTaskDetail(gid: string) {
    if (!client) await this.connect();
    try {
      const detail = await client!.request<any>("aria2.tellStatus", [gid]);
      if (state.selectedTaskId === gid) {
        setState("selectedTaskDetail", detail);
      }
      return detail;
    } catch (e: any) {
      if (e.message?.includes("No peer data is available")) {
        logger.debug(
          `Peer data unavailable for ${gid}, ignoring.`,
          LOG_CONTEXT,
        );
        return null;
      }
      logger.warn(`Failed to fetch detail for task ${gid}: ${e}`, LOG_CONTEXT);
      return null;
    }
  },

  async addTask(uris: string[], options: any = {}) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.addUri", [uris, options]);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to add task: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async addTorrentTask(base64Content: string, options: any = {}) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.addTorrent", [base64Content, [], options]);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to add torrent task: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async addMetalinkTask(base64Content: string, options: any = {}) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.addMetalink", [base64Content, options]);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to add metalink task: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async pauseTask(gid: string) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.pause", [gid]);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to pause task: `, LOG_CONTEXT);
      throw e;
    }
  },

  async pauseTasks(gids: string[]) {
    if (!client) await this.connect();
    try {
      const calls = gids.map((gid) => ({
        method: "aria2.pause",
        params: [gid],
      }));
      await client!.multicall(calls);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to pause tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async forcePauseTask(gid: string) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.forcePause", [gid]);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to force pause task: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async forcePauseTasks(gids: string[]) {
    if (!client) await this.connect();
    try {
      const calls = gids.map((gid) => ({
        method: "aria2.forcePause",
        params: [gid],
      }));
      await client!.multicall(calls);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to force pause tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async resumeTask(gid: string) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.unpause", [gid]);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to resume task: `, LOG_CONTEXT);
      throw e;
    }
  },

  async resumeTasks(gids: string[]) {
    if (!client) await this.connect();
    try {
      const calls = gids.map((gid) => ({
        method: "aria2.unpause",
        params: [gid],
      }));
      await client!.multicall(calls);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to resume tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async removeTask(gid: string) {
    if (!client) await this.connect();
    try {
      const task = state.tasks.find((t) => t.gid === gid);
      const isActive = task?.status === "active" || task?.status === "waiting" || task?.status === "paused";

      if (isActive) {
        await client!.request("aria2.remove", [gid]);
      } else {
        await client!.request("aria2.removeDownloadResult", [gid]);
      }

      // Local UI update
      setState("tasks", (tasks) => tasks.filter((t) => t.gid !== gid));
      this.fetchGlobalStat().catch(() => {});
    } catch (e) {
      logger.error(`Failed to remove task ${gid}: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async removeTasks(gids: string[]) {
    if (!client) await this.connect();
    try {
      const calls = gids.map((gid) => {
        const task = state.tasks.find((t) => t.gid === gid);
        const isActive = task?.status === "active" || task?.status === "waiting" || task?.status === "paused";
        return {
          method: isActive ? "aria2.remove" : "aria2.removeDownloadResult",
          params: [gid],
        };
      });
      await client!.multicall(calls);

      // Local UI update
      setState("tasks", (tasks) => tasks.filter((t) => !gids.includes(t.gid)));
      this.fetchGlobalStat().catch(() => {});
    } catch (e) {
      logger.error(`Failed to remove tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async forceRemoveTask(gid: string) {
    if (!client) await this.connect();
    try {
      const task = state.tasks.find((t) => t.gid === gid);
      const isActive = task?.status === "active" || task?.status === "waiting" || task?.status === "paused";

      if (isActive) {
        await client!.request("aria2.forceRemove", [gid]);
      } else {
        await client!.request("aria2.removeDownloadResult", [gid]);
      }

      // Local UI update
      setState("tasks", (tasks) => tasks.filter((t) => t.gid !== gid));
      this.fetchGlobalStat().catch(() => {});
    } catch (e) {
      logger.error(`Failed to force remove task ${gid}: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async forceRemoveTasks(gids: string[]) {
    if (!client) await this.connect();
    try {
      const calls = gids.map((gid) => {
        const task = state.tasks.find((t) => t.gid === gid);
        const isActive = task?.status === "active" || task?.status === "waiting" || task?.status === "paused";
        return {
          method: isActive ? "aria2.forceRemove" : "aria2.removeDownloadResult",
          params: [gid],
        };
      });
      await client!.multicall(calls);

      // Local UI update
      setState("tasks", (tasks) => tasks.filter((t) => !gids.includes(t.gid)));
      this.fetchGlobalStat().catch(() => {});
    } catch (e) {
      logger.error(`Failed to force remove tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async pauseAll() {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.pauseAll");
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to pause all tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async forcePauseAll() {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.forcePauseAll");
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to force pause all tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async resumeAll() {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.unpauseAll");
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to resume all tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async getTaskOption(gid: string, name: string) {
    if (!client) await this.connect();
    try {
      const res = await client!.request<any>(
        "aria2.getOption",
        [gid],
      );
      return res?.[name];
    } catch (e) {
      logger.error(`Failed to get task option ${name} for ${gid}: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async getPeers(gid: string): Promise<any[]> {
    if (!client) await this.connect();
    try {
      return await client!.request<any[]>("aria2.getPeers", [gid]);
    } catch (e) {
      return [];
    }
  },

  async getServers(gid: string): Promise<any[]> {
    if (!client) await this.connect();
    try {
      return await client!.request<any[]>("aria2.getServers", [gid]);
    } catch (e) {
      logger.debug(`Failed to get servers for task ${gid}: ${e}`, LOG_CONTEXT);
      return [];
    }
  },

  async getUris(gid: string): Promise<any[]> {
    if (!client) await this.connect();
    try {
      return await client!.request<any[]>("aria2.getUris", [gid]);
    } catch (e) {
      logger.debug(`Failed to get URIs for task ${gid}: ${e}`, LOG_CONTEXT);
      return [];
    }
  },

  async removeDownloadResult(gid: string): Promise<string> {
    if (!client) await this.connect();
    try {
      const result = await client!.request<string>(
        "aria2.removeDownloadResult",
        [gid],
      );
      // 成功移除后更新任务列表
      await this.fetchTasks();
      return result;
    } catch (e) {
      return "Error";
    }
  },

  async purgeDownloadResult(): Promise<string> {
    if (!client) await this.connect();
    try {
      const result = await client!.request<string>("aria2.purgeDownloadResult", []);
      await this.fetchTasks();
      return result;
    } catch (e) {
      logger.error(`Failed to purge download results: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async forceShutdown(): Promise<string> {
    if (!client) await this.connect();
    try {
      return await client!.request<string>("aria2.forceShutdown", []);
    } catch (e) {
      logger.error(`Failed to execute force shutdown: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async getSessionInfo(): Promise<any> {
    if (!client) await this.connect();
    try {
      return await client!.request<any>("aria2.getSessionInfo", []);
    } catch (e) {
      logger.error(`Failed to get session info: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async listNotifications(): Promise<string[]> {
    if (!client) await this.connect();
    try {
      return await client!.request<string[]>("system.listNotifications", []);
    } catch (e) {
      logger.error(`Failed to list notifications: ${e}`, LOG_CONTEXT);
      return [];
    }
  },

  async ed2kSearch(keyword: string, options?: Record<string, any>): Promise<string> {
    if (!client) await this.connect();
    try {
      const params: any[] = [keyword];
      if (options) {
        params.push(options);
      }
      return await client!.request<string>("aria2.ed2kSearch", params);
    } catch (e) {
      logger.error(`Failed to execute ED2K search for keyword '${keyword}': ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async getEd2kSearchResults(searchId: string): Promise<any> {
    if (!client) await this.connect();
    try {
      return await client!.request<any>("aria2.getEd2kSearchResults", [searchId]);
    } catch (e) {
      logger.error(`Failed to get ED2K search results for search ID '${searchId}': ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  /** Hide a GID from the task list (used for ED2K search tasks). */
  hideGid(gid: string) {
    hiddenGids.add(gid);
    // Also remove it from the visible task list immediately
    setState("tasks", (tasks) => tasks.filter((t) => t.gid !== gid));
    // If it was selected, deselect it
    if (state.selectedTaskId === gid) {
      setState("selectedTaskId", null);
      setState("selectedTaskDetail", null);
    }
  },

  /** Stop hiding a GID (call when the search task is done/removed). */
  unhideGid(gid: string) {
    hiddenGids.delete(gid);
  },

  async changeUri(
    gid: string,
    fileIndex: number,
    delUris: string[],
    addUris: string[],
    position?: number,
  ): Promise<[number, number]> {
    if (!client) await this.connect();
    try {
      return await client!.request<[number, number]>("aria2.changeUri", [
        gid,
        fileIndex,
        delUris,
        addUris,
        position,
      ]);
    } catch (e) {
      return [0, 0];
    }
  },

  async changeTaskOption(gid: string, options: Record<string, any>) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.changeOption", [gid, options]);
    } catch (e) {
      logger.error(`Failed to change task options for ${gid}: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async changePosition(
    gid: string,
    pos: number,
    how: "POS_SET" | "POS_CUR" | "POS_END",
  ): Promise<number> {
    if (!client) await this.connect();
    try {
      const newPos = await client!.request<number>("aria2.changePosition", [
        gid,
        pos,
        how,
      ]);
      await this.fetchTasks();
      return newPos;
    } catch (e) {
      logger.error(`Failed to change position for task ${gid}: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async changePositions(
    gids: string[],
    pos: number,
    how: "POS_SET" | "POS_CUR" | "POS_END",
  ): Promise<void> {
    if (!client) await this.connect();
    // To preserve relative order of moved tasks:
    // If moving to top (POS_SET), reverse GIDs list so the first checked task remains first
    const targetGids = how === "POS_SET" ? [...gids].reverse() : [...gids];
    try {
      for (const gid of targetGids) {
        await client!.request<number>("aria2.changePosition", [
          gid,
          pos,
          how,
        ]);
      }
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to change positions for tasks: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async getAllGlobalOptions() {
    if (!client) await this.connect();
    try {
      return await client!.request<Record<string, string>>(
        "aria2.getGlobalOption",
        [],
      );
    } catch (e) {
      logger.error(`Failed to get all global options: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async changeGlobalOption(name: string, value: any) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.changeGlobalOption", [
        { [name]: String(value) },
      ]);
    } catch (e) {
      logger.error(`Failed to change global option ${name}: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async limitDownloadSpeed(gid: string | null, limit: number) {
    if (!client) await this.connect();
    try {
      if (gid) {
        await client!.request("aria2.changeOption", [
        gid,
        { "max-download-limit": String(limit) },
        ]);
      } else {
        await client!.request("aria2.changeGlobalOption", [
        { "max-overall-download-limit": String(limit) },
        ]);
      }
    } catch (e) {
      logger.error(`Failed to limit download speed: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async limitUploadSpeed(gid: string | null, limit: number) {
    if (!client) await this.connect();
    try {
      if (gid) {
        await client!.request("aria2.changeOption", [
        gid,
        { "max-upload-limit": String(limit) },
        ]);
      } else {
        await client!.request("aria2.changeGlobalOption", [
        { "max-overall-upload-limit": String(limit) },
        ]);
      }
    } catch (e) {
      logger.error(`Failed to limit upload speed: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async saveSession() {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.saveSession");
    } catch (e) {
      logger.error(`Failed to save session: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async getServerInfo() {
    if (!client) await this.connect();
    try {
      return await client!.request<any>("aria2.getVersion", []);
    } catch (e) {
      logger.error(`Failed to fetch server info: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async shutdown() {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.shutdown", []);
    } catch (e) {
      logger.error(`Failed to shutdown: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  setSelectedTask(gid: string | null) {
    setState("selectedTaskId", gid);
    if (!gid) {
      setState("selectedTaskDetail", null);
    }
  },

  showTaskDetail(gid: string) {
    setState("selectedTaskId", gid);
    this.fetchTaskDetail(gid).catch((err) =>
      logger.error(`Error in showTaskDetail: ${err}`, LOG_CONTEXT),
    );
  },

  async setAppSettings(settings: Record<string, any>) {
    const updated = { ...state.appSettings, ...settings };
    setState("appSettings", updated);
    StorageService.set("ariang_settings", updated);
  },

  async requestSafe<T>(method: string, params: any[] = []): Promise<T> {
    if (state.connectionStatus === "connecting") {
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (state.connectionStatus === "connected") {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    if (state.connectionStatus !== "connected") {
      await this.connect();
    }

    if (!client) throw new Error("Aria2 client not initialized");
    return client.request<T>(method, params);
  },

  startPolling() {
    if (pollingTimer) return;
    let pollTicks = 0;
    pollingTimer = setInterval(async () => {
      if (state.connectionStatus !== "connected" || !client) return;
      try {
        pollTicks++;
        const promises: Promise<any>[] = [];

        // Every 15 ticks (30 seconds), perform a full sync. Otherwise, only update active tasks.
        if (pollTicks % 15 === 0) {
          promises.push(this.fetchTasks());
          promises.push(this.fetchGlobalStat());
        } else {
          promises.push(this.updateActiveTasksOnly());
        }

        if (state.selectedTaskId && state.selectedTaskDetail) {
          promises.push(this.fetchTaskDetail(state.selectedTaskId));
        }

        await Promise.all(promises);

        // Update isDownloading based on current tasks
        const hasActiveTasks = state.tasks.some((t) => t.status === "active");

        if (hasActiveTasks !== state.isDownloading) {
          setState("isDownloading", hasActiveTasks);
          logger.info(`Download state changed to: ${hasActiveTasks ? "Active" : "Idle"}`, LOG_CONTEXT);
        }
      } catch (e) {
        logger.warn(`Polling error: ${e}`, LOG_CONTEXT);
      }
    }, 2000);
  },

  stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  },

  setupEventListeners() {
    if (!client || listenersSetup) return;
    listenersSetup = true;

    client.on("aria2.onDownloadStart", (params: any[]) => {
      const gid = params[0].gid;
      logger.debug(`Task started: ${gid}`, LOG_CONTEXT);
      // Skip hidden GIDs (e.g. ED2K search tasks — they are not real downloads)
      if (hiddenGids.has(gid)) return;
      setState("isDownloading", true);
      if (state.selectedTaskId === gid) {
        this.fetchTaskDetail(gid).catch((err) =>
          logger.error(`Error in onDownloadStart: ${err}`, LOG_CONTEXT),
        );
      }
      this.fetchGlobalStat().catch((err) =>
        logger.error(
          `Error fetching global stat on start: ${err}`,
          LOG_CONTEXT,
        ),
      );
      notificationStore.add(`Task ${gid} has started downloading`, "info", `Task started`);
      notificationStore.notifyViaBrowser(`Aria2: Task Started`, `Task ${gid} has started downloading`);
    });

    client.on("aria2.onDownloadPause", (params: any[]) => {
      const gid = params[0].gid;
      logger.debug(`Task paused: ${gid}`, LOG_CONTEXT);
      setState("tasks", (t) => t.gid === gid, { status: "paused" });
      this.fetchGlobalStat().catch((err) =>
        logger.error(
          `Error fetching global stat on pause: ${err}`,
          LOG_CONTEXT,
        ),
      );
      notificationStore.add(`Task ${gid} is now paused`, "info", `Task paused`);
    });

    client.on("aria2.onDownloadStop", (params: any[]) => {
      const gid = params[0].gid;
      logger.debug(`Task stopped: ${gid}`, LOG_CONTEXT);
      setState("tasks", (prev) => prev.filter((t) => t.gid !== gid));
      notificationStore.add(`Task ${gid} has been stopped`, "info", `Task stopped`);
      notificationStore.notifyViaBrowser(`Aria2: Task Stopped`, `Task ${gid} has been stopped`);
      this.fetchGlobalStat().catch((err) =>
        logger.error(`Error fetching global stat on stop: ${err}`, LOG_CONTEXT),
      );
    });

    client.on("aria2.onDownloadComplete", (params: any[]) => {
      const gid = params[0].gid;
      logger.debug(`Task completed: ${gid}`, LOG_CONTEXT);
      // Skip hidden GIDs (e.g. ED2K search tasks) — do NOT touch hiddenGids here,
      // the polling loop in Ed2kSearch manages the GID lifecycle.
      if (hiddenGids.has(gid)) return;
      setState("tasks", (t) => t.gid === gid, { status: "complete" });
      setTimeout(() => {
        if (state.selectedTaskId === gid) {
          this.fetchTaskDetail(gid).catch((err) =>
            logger.warn(`Deferred fetch failed for ${gid}: ${err}`, LOG_CONTEXT),
          );
        }
        this.fetchTasks();
      }, 500);
      notificationStore.add(`Task ${gid} completed successfully`, "success", `Download Completed`);
      notificationStore.notifyViaBrowser(`Aria2: Download Complete`, `Task ${gid} completed successfully`);
      this.fetchGlobalStat().catch((err) =>
        logger.error(
          `Error fetching global stat on complete: ${err}`,
          LOG_CONTEXT,
        ),
      );
    });

    client.on("aria2.onDownloadError", (params: any[]) => {
      const gid = params[0].gid;
      logger.debug(`Task error: ${gid}`, LOG_CONTEXT);
      setState("tasks", (t) => t.gid === gid, { status: "error" });
      notificationStore.add(`Task ${gid} encountered an error`, "error", `Download Error`);
      notificationStore.notifyViaBrowser(`Aria2: Download Error`, `Task ${gid} encountered an error`);
      this.fetchGlobalStat().catch((err) =>
        logger.error(
          `Error fetching global stat on error: ${err}`,
          LOG_CONTEXT,
        ),
      );
    });
  },
}
