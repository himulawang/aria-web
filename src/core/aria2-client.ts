import type { Aria2Config } from "./types";
import { HttpRpcClient } from "./http-client";
import { WebSocketRpcClient } from "./ws-client";

export class Aria2Client {
    private config: Aria2Config;
    private httpClient: HttpRpcClient;
    private wsClient: WebSocketRpcClient;
    private heartbeatTimer: any = null;

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

    on(event: string, callback: Function) {
        this.wsClient.on(event, callback);
    }

    /**
     * 验证连接是否真正可用（Token验证及服务端响应）
     */
    async testConnection(): Promise<boolean> {
        try {
            console.log(
                "[Aria2Client] Testing connection with aria2.getGlobalStat...",
            );
            // 调用一个无需参数且轻量的接口来验证
            await this.request("aria2.getGlobalStat");
            console.log("[Aria2Client] Connection test passed!");
            return true;
        } catch (e) {
            console.error("[Aria2Client] Connection test failed:", e);
            return false;
        }
    }

    async connect() {
        if (this.config.useWebSocket) {
            await this.wsClient.connect();

            // Debug: List available methods to diagnose "No such method" errors
            try {
                const methods = await this.request("system.listMethods");
                console.log("[Aria2Client] Available RPC methods:", methods);
            } catch (e) {
                console.warn("[Aria2Client] Could not list methods:", e);
            }

            // 连接建立后立即验证
            const isOk = await this.testConnection();
            if (!isOk) {
                throw new Error(
                    "Aria2 RPC authentication failed or server unreachable",
                );
            }

            this.startHeartbeat();
        }
    }

    private startHeartbeat() {
        if (this.heartbeatTimer) return;

        // 每 30 秒发送一次心跳请求，防止中间代理（如 Nginx）因超时断开 WebSocket
        this.heartbeatTimer = setInterval(async () => {
            try {
                await this.request("aria2.getGlobalStat");
                console.log("[Aria2Client] Heartbeat sent");
            } catch (e) {
                console.warn(
                    "[Aria2Client] Heartbeat failed, connection might be lost",
                );
                this.stopHeartbeat();
            }
        }, 30000);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    async disconnect() {
        this.stopHeartbeat();
        // Note: WebSocketRpcClient doesn't have a disconnect method yet,
        // but we can implement one if needed.
    }
}
