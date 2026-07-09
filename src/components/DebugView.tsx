import { type Component, createSignal, For, Show } from "solid-js";
import { debugStore } from "../store/debug-store";
import { aria2Store } from "../store";
import { t } from "../i18n";

const DebugView: Component = () => {
  const state = debugStore.getState();
  const [activeTab, setActiveTab] = createSignal("logs");

  const executeRpcMethod = async () => {
    const method = state.rpcRequestMethod;
    const paramsStr = state.rpcRequestParameters;

    if (!method || !method.includes(".")) {
      alert("RPC method is illegal!");
      return;
    }

    try {
      const params = JSON.parse(paramsStr);
      // Aria2Client.request expects params as an array
      const requestParams = Array.isArray(params) ? params : [params];
      
      const response = await aria2Store.executeCustomRpc(method, requestParams);
      debugStore.setRpcResponse(response);
    } catch (e) {
      alert("RPC request parameters are invalid!");
    }
  };

  return (
    <div class="space-y-6">
      <div class="tabs tabs-boxed">
        <button 
          class={`tab ${activeTab() === "logs" ? "tab-active" : ""}`} 
          onClick={() => setActiveTab("logs")}
        >
          {t("debug.tabs.logs")() || "Latest Logs"}
        </button>
        <button 
          class={`tab ${activeTab() === "rpc" ? "tab-active" : ""}`} 
          onClick={() => setActiveTab("rpc")}
        >
          {t("debug.tabs.rpc")() || "Aria2 RPC Debug"}
        </button>
      </div>

      <Show when={activeTab() === "logs"}>
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div class="flex items-center gap-2">
                <span class="text-sm opacity-50">Log Level:</span>
                <select 
                  class="select select-bordered select-xs" 
                  value={state.logLevelFilter}
                  onChange={(e) => debugStore.setLogLevelFilter(e.target.value as any)}
                >
                  <option value="DEBUG">DEBUG</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <label class="label cursor-pointer gap-2 py-1">
                  <span class="label-text text-xs">Enable Debug Log</span>
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-xs" 
                    checked={state.enableDebugLog} 
                    onChange={(e) => debugStore.setEnableDebugLog(e.target.checked)} 
                  />
                </label>
                <button 
                  class="btn btn-xs btn-ghost" 
                  onClick={() => debugStore.clearLogs()}
                >
                  Clear Logs
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="table table-zebra w-full text-xs">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Time</th>
                    <th>Level</th>
                    <th>Content</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={state.logs.filter(l => {
                    const levelVals = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
                    return levelVals[l.level] >= levelVals[state.logLevelFilter];
                  })}>
                    {(log) => (
                      <tr>
                        <td>{log.id}</td>
                        <td>{log.time.toLocaleTimeString()}</td>
                        <td>
                          <span class={`badge badge-xs ${
                            log.level === "DEBUG" ? "badge-ghost" : 
                            log.level === "INFO" ? "badge-info" : 
                            log.level === "WARN" ? "badge-warning" : "badge-error"
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td class="break-all font-mono">{log.content}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Show>

      <Show when={activeTab() === "rpc"}>
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body space-y-4">
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-bold">Aria2 RPC Request Method</span>
              </label>
              <input 
                type="text" 
                class="input input-bordered w-full" 
                value={state.rpcRequestMethod}
                onInput={(e) => debugStore.setRpcRequest(e.currentTarget.value, state.rpcRequestParameters)}
              />
            </div>
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-bold">Aria2 RPC Request Parameters</span>
              </label>
              <textarea 
                class="textarea textarea-bordered w-full font-mono" 
                rows="6" 
                value={state.rpcRequestParameters}
                onInput={(e) => debugStore.setRpcRequest(state.rpcRequestMethod, e.currentTarget.value)}
              ></textarea>
            </div>
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-bold">Aria2 RPC Response</span>
              </label>
              <textarea 
                class="textarea textarea-bordered w-full font-mono bg-base-200" 
                rows="10" 
                readonly 
                value={JSON.stringify(state.rpcResponse, null, 2)}
              ></textarea>
            </div>
            <div class="flex justify-end">
              <button 
                class="btn btn-primary" 
                onClick={executeRpcMethod}
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default DebugView;
