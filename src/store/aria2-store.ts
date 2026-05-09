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
});

let client: Aria2Client | null = null;
let pollingTimer: any = null;

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
    if (client) {
      await client.disconnect();
    }
    setState("connectionStatus", "disconnected");
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

  async fetchTasks() {
    if (!client) await this.connect();
    try {
      const [active, waiting, stopped] = await Promise.all([
        client!.request<any[]>("aria2.tellActive", []),
        client!.request<any[]>("aria2.tellWaiting", [0, 1000]),
        client!.request<any[]>("aria2.tellStopped", [0, 1000]),
      ]);

      const allTasks = [...active, ...waiting, ...stopped].filter(
        (task) => task && typeof task === "object" && "gid" in task,
      );

      setState("tasks", allTasks);
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
      setState("selectedTaskDetail", detail);
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

  async pauseTask(gid: string) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.pause", [gid]);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to pause task: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async resumeTask(gid: string) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.unpause", [gid]);
      await this.fetchTasks();
    } catch (e) {
      logger.error(`Failed to resume task: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async removeTask(gid: string) {
    if (!client) await this.connect();
    try {
      const task = state.tasks.find((t) => t.gid === gid);
      const isActive = task?.status === "active" || task?.status === "waiting";

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

  async getOption(name: string) {
    if (!client) await this.connect();
    try {
      return await client!.request<string | number | boolean>(
        "aria2.getOption",
        [name],
      );
    } catch (e) {
      logger.error(`Failed to get option ${name}: ${e}`, LOG_CONTEXT);
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

  async changeOption(name: string, value: any) {
    if (!client) await this.connect();
    try {
      await client!.request("aria2.changeOption", [name, value]);
    } catch (e) {
      logger.error(`Failed to change option ${name}: ${e}`, LOG_CONTEXT);
      throw e;
    }
  },

  async getGlobalOption(name: string) {
    if (!client) await this.connect();
    try {
      return await client!.request<string | number | boolean>(
        "aria2.getGlobalOption",
        [name],
      );
    } catch (e) {
      logger.error(`Failed to get global option ${name}: ${e}`, LOG_CONTEXT);
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
    if (gid) {
      this.fetchTaskDetail(gid).catch((err) =>
        logger.error(`Error in setSelectedTask: ${err}`, LOG_CONTEXT),
      );
    } else {
      setState("selectedTaskDetail", null);
    }
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

    pollingTimer = setInterval(async () => {
      if (state.connectionStatus !== "connected" || !client) return;

      try {
        const calls: { method: string; params: any[] }[] = [
          { method: "aria2.tellActive", params: [] },
        ];

        // 只有在状态机处于 isDownloading 时才请求 GlobalStat
        if (state.isDownloading) {
          calls.push({ method: "aria2.getGlobalStat", params: [] });
        }

        const results = await client.multicall<any[]>(calls);

        const rawActive = results[0];
        const active =
          Array.isArray(rawActive) && Array.isArray(rawActive[0])
            ? rawActive[0]
            : Array.isArray(rawActive)
              ? rawActive
              : [];

        // 状态机转移：根据活跃任务数量更新 isDownloading
        const hasActiveTasks = active.length > 0;
        if (hasActiveTasks !== state.isDownloading) {
          setState("isDownloading", hasActiveTasks);
          logger.info(
            `Download state changed to: ${hasActiveTasks ? "Active" : "Idle"}`,
            LOG_CONTEXT,
          );
        }

        if (Array.isArray(rawActive) === false && rawActive) {
          logger.error(
            `Multicall: aria2.tellActive failed: ${JSON.stringify(rawActive)}`,
            LOG_CONTEXT,
          );
        }
        setState("tasks", (prev) => {
          const activeGids = new Set(active.map((t: any) => t.gid));
          return [
            ...active,
            ...prev.filter((t: any) => !activeGids.has(t.gid)),
          ];
        });

        // 只有在 Active 模式且有结果时更新 globalStat
        if (state.isDownloading && results[1]) {
          const rawStat = results[1];
          const stat =
            Array.isArray(rawStat) &&
            typeof rawStat[0] === "object" &&
            rawStat[0] !== null
              ? rawStat[0]
              : rawStat;
          setState("globalStat", stat);
        }
      } catch (e) {
        logger.warn(`Polling error: ${e}`, LOG_CONTEXT);
      }
    }, 3000);
  },

  stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  },

  setupEventListeners() {
    if (!client) return;

    client.on("aria2.onDownloadStart", (params: any[]) => {
      const gid = params[0].gid;
      logger.debug(`Task started: ${gid}`, LOG_CONTEXT);
      setState("isDownloading", true);
      this.fetchTaskDetail(gid).catch((err) =>
        logger.error(`Error in onDownloadStart: ${err}`, LOG_CONTEXT),
      );
      this.fetchGlobalStat().catch((err) =>
        logger.error(
          `Error fetching global stat on start: ${err}`,
          LOG_CONTEXT,
        ),
      );
    });

    client.on("aria2.onDownloadPause", (params: any[]) => {
      const gid = params[0].gid;
      logger.debug(`Task paused: ${gid}`, LOG_CONTEXT);
      setState("tasks", (t) => t.gid === gid, { status: "paused" });
      // 注意：这里不直接设为 false，因为可能还有其他任务在下载
      // 状态转移由下一次 tellActive 轮询最终决定
      this.fetchGlobalStat().catch((err) =>
        logger.error(
          `Error fetching global stat on pause: ${err}`,
          LOG_CONTEXT,
        ),
      );
    });

    client.on("aria2.onDownloadStop", (params: any[]) => {
      const gid = params[0].gid;
      logger.debug(`Task stopped: ${gid}`, LOG_CONTEXT);
      setState("tasks", (prev) => prev.filter((t) => t.gid !== gid));
      notificationStore.add(`Task stopped: ${gid}`, "info");
      this.fetchGlobalStat().catch((err) =>
        logger.error(`Error fetching global stat on stop: ${err}`, LOG_CONTEXT),
      );
    });

    client.on("aria2.onDownloadComplete", (params: any[]) => {
      const gid = params[0].gid;
      logger.debug(`Task completed: ${gid}`, LOG_CONTEXT);

      // 更新任务状态为 complete
      setState("tasks", (t) => t.gid === gid, { status: "complete" });

      // 延迟拉取详情，给后端更新元数据的时间
      setTimeout(() => {
        this.fetchTaskDetail(gid).catch((err) =>
          logger.warn(`Deferred fetch failed for ${gid}: ${err}`, LOG_CONTEXT),
        );
        // 强制全量刷新以确保任务列表数据准确
        this.fetchTasks();
      }, 500);

      notificationStore.add(`Download completed: ${gid}`, "success");

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
      notificationStore.add(`Download error: ${gid}`, "error");
      this.fetchGlobalStat().catch((err) =>
        logger.error(
          `Error fetching global stat on error: ${err}`,
          LOG_CONTEXT,
        ),
      );
    });
  },
};
