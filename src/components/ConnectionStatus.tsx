import { createMemo, type Component, createSignal, Show } from "solid-js";
import { aria2Store } from "../store";
import { formatSpeed } from "../utils/format";
import { t } from "../i18n";
import { HiOutlineArrowDownTray, HiOutlineArrowUpTray } from "solid-icons/hi";

const SpeedSummary: Component<{ isCollapsed: boolean }> = (props) => {
  const state = aria2Store.getState();
  const [showLimits, setShowLimits] = createSignal(false);
  const handleSetLimit = async (type: "down" | "up", val: number) => {
    const limit = val * 1024;
    if (type === "down")
      await aria2Store.limitDownloadSpeed(null as any, limit);
    else await aria2Store.limitUploadSpeed(null as any, limit);
  };
  return (
    <>
      <div
        class={`flex flex-col gap-2 p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300 transition-colors text-xs ${props.isCollapsed ? "items-center" : ""}`}
        onClick={() => setShowLimits(true)}
      >
        <div class="flex justify-between items-center opacity-80 w-full">
          <div class="flex items-center gap-1.5">
            <HiOutlineArrowDownTray class="w-4 h-4 text-primary" />
            {!props.isCollapsed &&
              formatSpeed(Number(state.globalStat?.downloadSpeed || 0))}
          </div>
          {!props.isCollapsed && (
            <div class="flex items-center gap-1.5">
              <HiOutlineArrowUpTray class="w-4 h-4 text-secondary" />
              {formatSpeed(Number(state.globalStat?.uploadSpeed || 0))}
            </div>
          )}
        </div>
      </div>
      <Show when={showLimits()}>
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Speed Limits</h3>
            <div class="py-4 space-y-4">
              <input
                type="number"
                placeholder="Download Limit (KB/s)"
                class="input input-bordered w-full"
                onBlur={(e) => handleSetLimit("down", Number(e.target.value))}
              />
              <input
                type="number"
                placeholder="Upload Limit (KB/s)"
                class="input input-bordered w-full"
                onBlur={(e) => handleSetLimit("up", Number(e.target.value))}
              />
            </div>
            <div class="modal-action">
              <button class="btn" onClick={() => setShowLimits(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};

const ConnectionStatus: Component<{ isCollapsed: boolean }> = (props) => {
  const state = aria2Store.getState();
  const statusInfo = createMemo(() => {
    switch (state.connectionStatus) {
      case "connected":
        return { text: "Connected", color: "bg-success" };
      case "connecting":
        return { text: "Connecting...", color: "bg-warning" };
      case "error":
        return { text: "Connection Error", color: "bg-error" };
      default:
        return { text: "Disconnected", color: "bg-base-content/30" };
    }
  });
  return (
    <div class="flex items-center gap-2 px-2">
      <div
        class={`w-2.5 h-2.5 rounded-full ${statusInfo().color}`}
        title={statusInfo().text}
      />
      {!props.isCollapsed && (
        <span class="text-xs font-medium opacity-80">{statusInfo().text}</span>
      )}
    </div>
  );
};

export { ConnectionStatus as default, SpeedSummary };
