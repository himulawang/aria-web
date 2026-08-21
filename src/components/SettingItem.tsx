import { type Component, Show, For, createSignal } from "solid-js";
import { aria2Store } from "../store";
import { trackerService } from "../utils/tracker-service";
import { t } from "../i18n";
import { HiOutlineArrowPath } from "solid-icons/hi";

interface SettingItemProps {
  optName: string;
  opt: any;
  value: () => any;
  onUpdate?: (name: string, value: any) => void;
}

const SettingItem: Component<SettingItemProps> = (props) => {
  const [isSyncing, setIsSyncing] = createSignal(false);

  const handleUpdate = async (newValue: any) => {
    try {
      if (props.onUpdate) {
        await props.onUpdate(props.optName, newValue);
      } else {
        await aria2Store.changeGlobalOption(props.optName, newValue);
      }
    } catch (e) {
      throw e;
    }
  };

  const handleSyncTrackers = async () => {
    setIsSyncing(true);
    try {
      await trackerService.syncTrackersToAria2();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div class="flex items-center justify-between py-3 border-b border-base-300 last:border-none">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium">{props.opt.name || props.optName}</label>
        <Show when={props.opt.description}>
          <div
            class="tooltip tooltip-right"
            data-tip={
              Array.isArray(props.opt.description)
                ? props.opt.description.join(" ")
                : props.opt.description
            }
          >
            <span class="btn btn-ghost btn-xs btn-circle opacity-50">?</span>
          </div>
        </Show>
      </div>
      <div class="flex items-center gap-2">
        {(() => {
          switch (props.opt.type) {
            case "boolean":
              return (
                <input
                  type="checkbox"
                  class="toggle toggle-sm toggle-primary"
                  checked={String(props.value()) === "true"}
                  disabled={props.opt.readonly}
                  onChange={(e) => handleUpdate(String(e.currentTarget.checked))}
                />
              );
            case "integer":
            case "number":
              return (
                <input
                  type="number"
                  class="input input-bordered input-sm w-24"
                  value={props.value()}
                  disabled={props.opt.readonly}
                  onInput={(e) => handleUpdate(parseInt(e.currentTarget.value, 10))}
                />
              );
            case "option":
              return (
                <select
                  class="select select-bordered select-sm w-32"
                  value={String(props.value() ?? "")}
                  disabled={props.opt.readonly}
                  onChange={(e) => handleUpdate(e.currentTarget.value)}
                >
                  <For each={props.opt.options || []}>
                    {(o) => <option value={o}>{o}</option>}
                  </For>
                </select>
              );
            default:
              return (
                <div class="flex items-center gap-1.5">
                  <input
                    type="text"
                    class="input input-bordered input-sm w-44 md:w-64 font-mono text-xs"
                    value={String(props.value() ?? "")}
                    disabled={props.opt.readonly}
                    onInput={(e) => handleUpdate(e.currentTarget.value)}
                  />
                  <Show when={props.optName === "bt-tracker"}>
                    <button
                      class="btn btn-sm btn-outline btn-primary gap-1"
                      onClick={handleSyncTrackers}
                      disabled={isSyncing()}
                      title={t("app.settings.syncTrackersTooltip")() || "一键从公共源同步最新优质 BT Tracker 列表"}
                    >
                      <HiOutlineArrowPath class={`w-4 h-4 ${isSyncing() ? "animate-spin" : ""}`} />
                      <span class="text-xs">{t("app.settings.syncTrackers")() || "同步 Trackers"}</span>
                    </button>
                  </Show>
                </div>
              );
          }
        })()}
      </div>
    </div>
  );
};

export default SettingItem;
