import { createStore } from "solid-js/store";

export interface DebugLog {
  id: number;
  time: Date;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  head: string;
  content: string;
  attachment?: any;
}

interface DebugState {
  logs: DebugLog[];
  logLevelFilter: "DEBUG" | "INFO" | "WARN" | "ERROR";
  enableDebugLog: boolean;
  rpcRequestMethod: string;
  rpcRequestParameters: string;
  rpcResponse: any;
}

const [state, setState] = createStore<DebugState>({
  logs: [],
  logLevelFilter: "DEBUG",
  enableDebugLog: false,
  rpcRequestMethod: "",
  rpcRequestParameters: "{}",
  rpcResponse: null,
});

let logIndex = 0;

export const debugStore = {
  getState: () => state,

  setEnableDebugLog(value: boolean) {
    setState("enableDebugLog", value);
  },

  setLogLevelFilter(level: "DEBUG" | "INFO" | "WARN" | "ERROR") {
    setState("logLevelFilter", level);
  },

  clearLogs() {
    logIndex = 0;
    setState("logs", []);
  },

  addLog(level: "DEBUG" | "INFO" | "WARN" | "ERROR", head: string, msg: string, obj?: any) {
    if (!state.enableDebugLog) return;

    const newLog: DebugLog = {
      id: ++logIndex,
      time: new Date(),
      level,
      head,
      content: msg,
      attachment: obj,
    };

    setState("logs", (prev) => [newLog, ...prev].slice(0, 1000));
  },

  setRpcRequest(method: string, params: string) {
    setState("rpcRequestMethod", method);
    setState("rpcRequestParameters", params);
  },

  setRpcResponse(response: any) {
    setState("rpcResponse", response);
  },
};
