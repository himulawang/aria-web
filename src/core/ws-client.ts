import { logger } from "./logger";
import type {
  Aria2Config,
  RpcRequest,
  RpcResponse,
  RpcNotification,
} from "./types";

const LOG_CONTEXT = "WebSocketRpcClient";

export class WebSocketRpcClient {
  private config: Aria2Config;
  private socket: WebSocket | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: Function; reject: Function }
  >();
  private eventListeners = new Map<string, Set<Function>>();
  private reconnectTimer: any = null;
  private isConnecting = false;

  constructor(config: Aria2Config) {
    this.config = config;
  }

  private getWsUrl(): string {
    let url = this.config.url;
    if (url.startsWith("http://")) {
      url = url.replace("http://", "ws://");
    } else if (url.startsWith("https://")) {
      url = url.replace("https://", "wss://");
    }
    // Ensure it ends with /jsonrpc if it's just the base URL
    if (!url.endsWith("/jsonrpc") && !url.includes("/jsonrpc")) {
      url = url.replace(/\/$/, "") + "/jsonrpc";
    }
    return url;
  }

  async connect(): Promise<void> {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    this.isConnecting = true;
    const wsUrl = this.getWsUrl();
    logger.info(`Connecting to ${wsUrl}...`, LOG_CONTEXT);

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          logger.info("Connected successfully", LOG_CONTEXT);
          this.isConnecting = false;
          resolve();
        };

        this.socket.onerror = (err) => {
          logger.error(`WebSocket error: ${err}`, LOG_CONTEXT);
          this.isConnecting = false;
          reject(err);
        };

        this.socket.onmessage = (msg) => this.handleMessage(msg.data);

        this.socket.onclose = (event) => {
          logger.warn(`Closed: ${event.code} ${event.reason}`, LOG_CONTEXT);
          this.isConnecting = false;
          this.handleClose();
        };
      } catch (e) {
        this.isConnecting = false;
        reject(e);
      }
    });
  }

  private handleMessage(data: string) {
    try {
      const response: RpcResponse | RpcNotification = JSON.parse(data);
      logger.debug(`Received: ${JSON.stringify(response)}`, LOG_CONTEXT);

      if ("id" in response) {
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          if (response.error) {
            logger.error(
              `Request ${response.id} failed: ${JSON.stringify(response.error)}`,
              LOG_CONTEXT,
            );
            pending.reject(new Error(response.error.message));
          } else {
            pending.resolve(response.result);
          }
          this.pendingRequests.delete(response.id);
        }
      } else if ("method" in response) {
        const listeners = this.eventListeners.get(response.method);
        if (listeners) {
          listeners.forEach((cb) => cb(response.params));
        }
      }
    } catch (e) {
      logger.error(
        `Failed to parse message: ${data}, error: ${e}`,
        LOG_CONTEXT,
      );
    }
  }

  private handleClose() {
    this.pendingRequests.forEach((p) =>
      p.reject(new Error("WebSocket closed")),
    );
    this.pendingRequests.clear();

    if (this.reconnectTimer) return;

    logger.info(
      `Scheduling reconnect in ${this.config.wsReconnectInterval}ms...`,
      LOG_CONTEXT,
    );
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (e) {
        logger.error("Reconnect failed", LOG_CONTEXT);
      }
    }, this.config.wsReconnectInterval);
  }

  async request<T>(method: string, params: any[] = []): Promise<T> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const id = Math.random().toString(36).substring(2, 15);
    const body: RpcRequest = { jsonrpc: "2.0", id, method, params };

    const noisyMethods = ["aria2.tellActive", "aria2.getGlobalStat"];
    if (!noisyMethods.includes(method)) {
      logger.debug(`Sending Request [${id}] ${method}`, LOG_CONTEXT);
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      try {
        this.socket!.send(JSON.stringify(body));
      } catch (e) {
        this.pendingRequests.delete(id);
        reject(e);
      }
    });
  }

  async multicall(
    methods: { methodName: string; params: any[] }[],
  ): Promise<any[]> {
    const params = methods.map((m) => ({
      methodName: m.methodName,
      params: m.params,
    }));
    return await this.request("system.multicall", [params]);
  }

  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }
}
