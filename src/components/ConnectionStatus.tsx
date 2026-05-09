import { createMemo, type Component, createSignal, Show } from "solid-js";
import { aria2Store } from "../store";
import { formatSpeed } from "../utils/format";
import { t } from "../i18n";
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
  HiOutlineCog6Tooth,
} from "solid-icons/hi";

const SpeedSummary: Component<{ isCollapsed: boolean }> = (props) => {
  const state = aria2Store.getState();
  const [showLimits, setShowLimits] = createSignal(false);
  const [limits, setLimits] = createSignal({ download: 0, upload: 0 });

  const openLimits = async () => {
    setShowLimits(true);
    const options = await aria2Store.getAllGlobalOptions();
    setLimits({
      download: Number(options["max-overall-download-limit"] || 0) / 1024,
      upload: Number(options["max-overall-upload-limit"] || 0) / 1024,
    });
  };

  const handleSetLimit = async (type: "down" | "up", val: number) => {
    const limit = val * 1024;
    if (type === "down")
      await aria2Store.limitDownloadSpeed(null as any, limit);
    else await aria2Store.limitUploadSpeed(null as any, limit);
    setLimits((prev) => ({ ...prev, [type]: val }));
  };
  return (
    <>
      <div
        class={`flex flex-col gap-2 p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300 transition-colors text-xs ${props.isCollapsed ? "items-center" : ""}`}
        onClick={openLimits}
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
          <div class="modal-box p-0 overflow-hidden">
            <div class="p-6">
              <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                <HiOutlineCog6Tooth class="w-5 h-5" />
                {t("nav.settings.connectionOptions")()}
              </h3>
              <div class="space-y-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">
                      {t("task-detail.downLimit")()} (KB/s)
                    </span>
                  </label>
                  <label class="input-group flex">
                    <input
                      type="number"
                      placeholder="0"
                      class="input input-bordered w-full"
                      value={limits().download || ""}
                      onBlur={(e) =>
                        handleSetLimit("down", Number(e.target.value))
                      }
                    />
                    <span class="bg-base-200">KB/s</span>
                  </label>
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">
                      {t("task-detail.upLimit")()} (KB/s)
                    </span>
                  </label>
                  <label class="input-group flex">
                    <input
                      type="number"
                      placeholder="0"
                      class="input input-bordered w-full"
                      value={limits().upload || ""}
                      onBlur={(e) =>
                        handleSetLimit("up", Number(e.target.value))
                      }
                    />
                    <span class="bg-base-200">KB/s</span>
                  </label>
                </div>
              </div>
            </div>
            <div class="modal-action p-6 pt-0">
              <button
                class="btn btn-primary"
                onClick={() => setShowLimits(false)}
              >
                {t("common.save")()}
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => setShowLimits(false)}
          ></div>
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
