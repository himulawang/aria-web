import { type Component, Show, For } from "solid-js";
import { aria2Store } from "../store";

interface SettingItemProps {
  optName: string;
  opt: any;
  value: () => any;
  onUpdate?: (name: string, value: any) => void;
}

const SettingItem: Component<SettingItemProps> = (props) => {
  const handleUpdate = async (newValue: any) => {
    try {
      if (props.onUpdate) {
        await props.onUpdate(props.optName, newValue);
      } else {
        await aria2Store.changeGlobalOption(props.optName, newValue);
      }
    } catch (e) {
      // If there's no onUpdate, we might want a fallback notification here, 
      // but usually the parent should handle it.
      throw e;
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
      <div class="flex items-center">
        {(() => {
          switch (props.opt.type) {
            case "boolean":
              return (
                <input
                  type="checkbox"
                  class="toggle toggle-sm toggle-primary"
                  checked={String(props.value()) === "true"}
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
                  onInput={(e) => handleUpdate(parseInt(e.currentTarget.value, 10))}
                />
              );
            case "option":
              return (
                <select
                  class="select select-bordered select-sm w-32"
                  value={String(props.value() ?? "")}
                  onChange={(e) => handleUpdate(e.currentTarget.value)}
                >
                  <For each={props.opt.options || []}>
                    {(o) => <option value={o}>{o}</option>}
                  </For>
                </select>
              );
            default:
              return (
                <input
                  type="text"
                  class="input input-bordered input-sm w-32"
                  value={String(props.value() ?? "")}
                  onInput={(e) => handleUpdate(e.currentTarget.value)}
                />
              );
          }
        })()}
      </div>
    </div>
  );
};

export default SettingItem;
