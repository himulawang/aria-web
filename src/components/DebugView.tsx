import { type Component, createSignal, For, Show } from "solid-js";
import { debugStore } from "../store/debug-store";
import { aria2Store } from "../store";
import { t } from "../i18n";

function parseLogContent(content: string) {
  const braceIndex = content.indexOf('{');
  const bracketIndex = content.indexOf('[');
  let jsonStartIndex = -1;
  if (braceIndex !== -1 && bracketIndex !== -1) {
    jsonStartIndex = Math.min(braceIndex, bracketIndex);
  } else if (braceIndex !== -1) {
    jsonStartIndex = braceIndex;
  } else if (bracketIndex !== -1) {
    jsonStartIndex = bracketIndex;
  }

  if (jsonStartIndex !== -1) {
    const prefix = content.substring(0, jsonStartIndex);
    const jsonStr = content.substring(jsonStartIndex);
    try {
      const parsed = JSON.parse(jsonStr);
      return { hasJson: true, prefix, json: parsed };
    } catch (e) {
      // Not valid JSON
    }
  }
  return { hasJson: false, text: content };
}

const JsonViewer: Component<{ value: any; name?: string; isLast?: boolean }> = (props) => {
  const type = () => typeof props.value;
  const isObject = () => props.value !== null && (type() === "object");
  
  if (props.value === null) {
    return (
      <div class="pl-4">
        {props.name && <span class="text-secondary">{props.name}: </span>}
        <span class="text-neutral-500 font-bold">null</span>
        {!props.isLast && <span class="text-base-content/50">,</span>}
      </div>
    );
  }

  if (!isObject()) {
    const formattedValue = () => {
      if (type() === "string") return `"${props.value}"`;
      return String(props.value);
    };
    const valClass = () => {
      if (type() === "string") return "text-success";
      if (type() === "number") return "text-info";
      if (type() === "boolean") return "text-warning";
      return "text-base-content";
    };
    return (
      <div class="pl-4">
        {props.name && <span class="text-secondary">{props.name}: </span>}
        <span class={valClass()}>{formattedValue()}</span>
        {!props.isLast && <span class="text-base-content/50">,</span>}
      </div>
    );
  }

  const isArray = () => Array.isArray(props.value);
  const keys = () => Object.keys(props.value);
  const openChar = () => isArray() ? "[" : "{";
  const closeChar = () => isArray() ? "]" : "}";

  return (
    <div class="pl-4">
      <details class="group select-none" open={false}>
        <summary class="cursor-pointer list-none flex items-center gap-1 hover:bg-base-200/50 rounded px-1 -ml-1 [&::-webkit-details-marker]:hidden">
          <span class="text-base-content/30 group-open:rotate-90 transition-transform text-[10px]">▶</span>
          {props.name && <span class="text-secondary">{props.name}: </span>}
          <span class="font-bold opacity-60">
            {isArray() ? `Array(${keys().length})` : `Object`}
          </span>
          <span class="text-base-content/40">{openChar()}...{closeChar()}</span>
        </summary>
        <div class="border-l border-base-300 pl-2 ml-1 mt-1 space-y-0.5">
          <For each={keys()}>
            {(key, index) => {
              const isLastItem = index() === keys().length - 1;
              const childValue = props.value[key];
              return (
                <JsonViewer
                  name={isArray() ? undefined : key}
                  value={childValue}
                  isLast={isLastItem}
                />
              );
            }}
          </For>
        </div>
        <div class="text-base-content/40 group-open:block hidden pl-1">
          {closeChar()}{!props.isLast && <span class="text-base-content/50">,</span>}
        </div>
      </details>
    </div>
  );
};

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
      const requestParams = Array.isArray(params) ? params : [params];
      
      const response = await aria2Store.executeCustomRpc(method, requestParams);
      debugStore.setRpcResponse(response);
    } catch (e) {
      alert("RPC request parameters are invalid!");
    }
  };

  return (
    <div class="space-y-6 h-full flex flex-col overflow-hidden">
      <div class="tabs tabs-boxed flex-none">
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
        <div class="card bg-base-100 shadow-sm border border-base-300 flex-1 flex flex-col overflow-hidden">
          <div class="card-body flex flex-col h-full overflow-hidden">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-4 flex-none">
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

            <div class="overflow-auto flex-1 border border-base-200 rounded-lg">
              <table class="table table-zebra w-full text-xs">
                <thead>
                  <tr class="sticky top-0 bg-base-100 z-10 border-b border-base-300">
                    <th>ID</th>
                    <th>Time</th>
                    <th>Level</th>
                    <th>Head</th>
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
                        <td class="font-semibold text-secondary">{log.head}</td>
                        <td class="break-all font-mono">
                          {(() => {
                            const parsed = parseLogContent(log.content);
                            if (parsed.hasJson) {
                              return (
                                <div class="space-y-1">
                                  <div class="text-base-content/70">{parsed.prefix}</div>
                                  <div class="bg-base-200/40 p-2 rounded-lg border border-base-300 overflow-x-auto text-[11px] max-w-full">
                                    <JsonViewer value={parsed.json} />
                                  </div>
                                </div>
                              );
                            }
                            return log.content;
                          })()}
                        </td>
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
        <div class="card bg-base-100 shadow-sm border border-base-300 flex-1 overflow-y-auto">
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
              <Show 
                when={state.rpcResponse}
                fallback={
                  <div class="bg-base-200 text-base-content/40 p-4 rounded-lg border border-base-300 font-mono text-xs">
                    No response yet. Execute a method above.
                  </div>
                }
              >
                <div class="bg-base-200/50 p-4 rounded-lg border border-base-300 overflow-auto max-h-96 text-xs">
                  <JsonViewer value={state.rpcResponse} />
                </div>
              </Show>
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
