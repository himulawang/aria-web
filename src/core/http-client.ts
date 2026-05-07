import type { Aria2Config, RpcRequest, RpcResponse } from "./types";

export class HttpRpcClient {
    private config: Aria2Config;

    constructor(config: Aria2Config) {
        this.config = config;
    }

    private getHeaders() {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (this.config.requestHeaders) {
            this.config.requestHeaders.split("\n").forEach((line) => {
                const [key, value] = line.split(":");
                if (key && value) headers[key.trim()] = value.trim();
            });
        }
        return headers;
    }

    async request<T>(method: string, params: any[] = []): Promise<T> {
        const id = Math.random().toString(36).substring(2, 15);
        const body: RpcRequest = { jsonrpc: "2.0", id, method, params };

        let url = this.config.url;
        let options: RequestInit = {
            method: this.config.httpMethod,
            headers: this.getHeaders(),
        };

        if (this.config.httpMethod === "POST") {
            options.body = JSON.stringify(body);
        } else {
            const query = new URLSearchParams();
            query.append("jsonrpc", "2.0");
            query.append("id", id);
            query.append("method", method);
            params.forEach((p, i) => {
                const val = typeof p === "object" ? btoa(JSON.stringify(p)) : p;
                query.append(`params[${i}]`, val);
            });
            url += `?${query.toString()}`;
            options.method = "GET";
        }

        const response = await fetch(url, options);
        const data: RpcResponse<T> = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }
        return data.result as T;
    }
}
