import type {
    Aria2Config,
    RpcRequest,
    RpcResponse,
    RpcNotification,
} from "./types";

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
        console.log(`[WebSocketRpcClient] Connecting to ${wsUrl}...`);

        return new Promise((resolve, reject) => {
            try {
                this.socket = new WebSocket(wsUrl);

                this.socket.onopen = () => {
                    console.log("[WebSocketRpcClient] Connected successfully");
                    this.isConnecting = false;
                    resolve();
                };

                this.socket.onerror = (err) => {
                    console.error("[WebSocketRpcClient] WebSocket error:", err);
                    this.isConnecting = false;
                    reject(err);
                };

                this.socket.onmessage = (msg) => this.handleMessage(msg.data);

                this.socket.onclose = (event) => {
                    console.warn(
                        `[WebSocketRpcClient] Closed: ${event.code} ${event.reason}`,
                    );
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
            console.log("[WebSocketRpcClient] Received:", response);

            if ("id" in response) {
                const pending = this.pendingRequests.get(response.id);
                if (pending) {
                    if (response.error) {
                        console.error(
                            `[WebSocketRpcClient] Request ${response.id} failed:`,
                            response.error,
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
            console.error(
                "[WebSocketRpcClient] Failed to parse message:",
                data,
                e,
            );
        }
    }

    private handleClose() {
        this.pendingRequests.forEach((p) =>
            p.reject(new Error("WebSocket closed")),
        );
        this.pendingRequests.clear();

        if (this.reconnectTimer) return;

        console.log(
            `[WebSocketRpcClient] Scheduling reconnect in ${this.config.wsReconnectInterval}ms...`,
        );
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                await this.connect();
            } catch (e) {
                console.error("[WebSocketRpcClient] Reconnect failed");
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
            console.log(
                `[WebSocketRpcClient] Sending Request [${id}] ${method}`,
                params,
            );
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

    on(event: string, callback: Function) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback);
    }
}
