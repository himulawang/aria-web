import { logger } from "./logger";
import type { Aria2Config } from "./types";
import { HttpRpcClient } from "./http-client";
import { WebSocketRpcClient } from "./ws-client";

const LOG_CONTEXT = "Aria2Client";

export class Aria2Client {
  private config: Aria2Config;
  private httpClient: HttpRpcClient;
  private wsClient: WebSocketRpcClient;
  private isFallbackToHttp = false;

  constructor(config: Aria2Config) {
    this.config = config;
    this.httpClient = new HttpRpcClient(config);
    this.wsClient = new WebSocketRpcClient(config);
  }

  getProtocol(): "WebSocket" | "HTTP" {
    return this.config.useWebSocket && !this.isFallbackToHttp ? "WebSocket" : "HTTP";
  }

  async request<T>(
    method: string,
    params: any[] = [],
    skipToken = false,
  ): Promise<T> {
    // Create a copy of params to avoid mutating the original array
    const requestParams = [...params];

    // Aria2 requires the token as the first element of the params array if a secret is set, prefixed with 'token:'
    // skipToken is used for special methods like system.multicall which handle tokens differently
    if (this.config.token && !skipToken) {
      requestParams.unshift(`token:${this.config.token}`);
    }

    if (this.config.useWebSocket && !this.isFallbackToHttp) {
      try {
        return await this.wsClient.request<T>(method, requestParams);
      } catch (wsErr) {
        // If WS request fails due to socket closing, fallback to HTTP seamlessly
        logger.warn(`WS request failed (${wsErr}), attempting fallback to HTTP`, LOG_CONTEXT);
        this.isFallbackToHttp = true;
        return this.httpClient.request<T>(method, requestParams);
      }
    }
    return this.httpClient.request<T>(method, requestParams);
  }

  async multicall<T = any[]>(
    calls: { method: string; params: any[] }[],
  ): Promise<T> {
    const formattedCalls = calls.map((call) => {
      const params = [...call.params];
      if (this.config.token) {
        params.unshift(`token:${this.config.token}`);
      }
      return {
        methodName: call.method,
        params: params,
      };
    });

    return this.request<T>("system.multicall", [formattedCalls], true);
  }

  on(event: string, callback: Function) {
    this.wsClient.on(event, callback);
  }

  /**
   * 验证连接是否真正可用（Token验证及服务端响应）
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info(
        "Testing connection with aria2.getGlobalStat...",
        LOG_CONTEXT,
      );
      await this.request("aria2.getGlobalStat");
      logger.info(`Connection test passed via ${this.getProtocol()}!`, LOG_CONTEXT);
      return true;
    } catch (e) {
      logger.error(`Connection test failed: ${e}`, LOG_CONTEXT);
      return false;
    }
  }

  async connect() {
    this.isFallbackToHttp = false;

    if (this.config.useWebSocket) {
      try {
        logger.info("Attempting WebSocket connection...", LOG_CONTEXT);
        await this.wsClient.connect();

        // Check if WS can actually communicate with token
        const isOk = await this.testConnection();
        if (isOk) {
          logger.info("WebSocket connection established and verified", LOG_CONTEXT);
          return;
        }
        throw new Error("WebSocket authentication check failed");
      } catch (wsErr) {
        logger.warn(
          `WebSocket connection failed (${wsErr}). Falling back to HTTP POST RPC...`,
          LOG_CONTEXT,
        );
        this.isFallbackToHttp = true;
        const httpOk = await this.testConnection();
        if (!httpOk) {
          throw new Error("Aria2 RPC authentication failed or server unreachable via both WS and HTTP");
        }
        logger.info("HTTP RPC fallback connection established and verified", LOG_CONTEXT);
        return;
      }
    } else {
      const isOk = await this.testConnection();
      if (!isOk) {
        throw new Error("Aria2 RPC authentication failed or server unreachable via HTTP");
      }
    }
  }

  async disconnect() {
    if (this.config.useWebSocket) {
      await this.wsClient.disconnect();
    }
    this.isFallbackToHttp = false;
  }
}
