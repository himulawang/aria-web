import { logger } from "./logger";
import type { Aria2Config } from "./types";
import { HttpRpcClient } from "./http-client";
import { WebSocketRpcClient } from "./ws-client";

const LOG_CONTEXT = "Aria2Client";

export class Aria2Client {
  private config: Aria2Config;
  private httpClient: HttpRpcClient;
  private wsClient: WebSocketRpcClient;

  constructor(config: Aria2Config) {
    this.config = config;
    this.httpClient = new HttpRpcClient(config);
    this.wsClient = new WebSocketRpcClient(config);
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

    if (this.config.useWebSocket) {
      return this.wsClient.request<T>(method, requestParams);
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
      // 调用一个无需参数且轻量的接口来验证
      await this.request("aria2.getGlobalStat");
      logger.info("Connection test passed!", LOG_CONTEXT);
      return true;
    } catch (e) {
      logger.error(`Connection test failed: ${e}`, LOG_CONTEXT);
      return false;
    }
  }

  async connect() {
    if (this.config.useWebSocket) {
      await this.wsClient.connect();

      // Debug: List available methods to diagnose "No such method" errors
      try {
        const methods = await this.request("system.listMethods");
        logger.debug(
          `Available RPC methods: ${JSON.stringify(methods)}`,
          LOG_CONTEXT,
        );
      } catch (e) {
        logger.warn(`Could not list methods: ${e}`, LOG_CONTEXT);
      }

      // 连接建立后立即验证
      const isOk = await this.testConnection();
      if (!isOk) {
        throw new Error(
          "Aria2 RPC authentication failed or server unreachable",
        );
      }
    }
  }

  async disconnect() {
    // Note: WebSocketRpcClient doesn't have a disconnect method yet,
    // but we can implement one if needed.
  }
}
