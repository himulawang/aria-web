export interface RpcRequest {
    jsonrpc: "2.0";
    id: string;
    method: string;
    params: any[];
}

export interface RpcResponse<T = any> {
    jsonrpc: "2.0";
    id: string;
    result?: T;
    error?: RpcError;
}

export interface RpcNotification {
    jsonrpc: "2.0";
    method: string;
    params: any[];
}

export interface RpcError {
    code: number;
    message: string;
}

export interface Aria2Config {
    url: string;
    token: string;
    useWebSocket: boolean;
    httpMethod: "GET" | "POST";
    requestHeaders?: string; // 格式: "Key: Value\nKey2: Value2"
    wsReconnectInterval: number;
}
