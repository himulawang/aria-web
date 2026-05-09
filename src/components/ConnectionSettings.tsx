import { type Component, createSignal, For, Show, onMount } from "solid-js";
import { aria2Store } from "../store";
import { notificationStore } from "../store/notification-store";
import { t } from "../i18n";
import { aria2AllOptions } from "../config/aria2-options";
import { aria2GlobalAvailableOptions } from "../config/aria2-available-options";

interface ConnectionSettingsProps {
  activeSubTab: string | null;
  setActiveSubTab: (tab: string | null) => void;
}

const ConnectionSettings: Component<ConnectionSettingsProps> = (props) => {
  const state = aria2Store.getState();
  const [optionValues, setOptionValues] = createSignal<Record<string, any>>({});

  const updateOption = async (name: string, value: any) => {
    setOptionValues({ ...optionValues(), [name]: value });
    try {
      await aria2Store.changeGlobalOption(name, value);
      notificationStore.add(`Updated ${name}`, "success");
    } catch (e) {
      notificationStore.add(`Failed to update ${name}`, "error");
    }
  };

  onMount(async () => {
    const allOptions = await aria2Store.requestSafe(
      "aria2.getGlobalOption",
      [],
    );
    if (typeof allOptions === "object" && allOptions !== null) {
      setOptionValues(allOptions as Record<string, any>);
    }
  });

  const OptionItem: Component<{ optName: string; opt: any }> = (p) => {
    const value = () => optionValues()[p.optName];

    return (
      <div class="flex items-center justify-between py-3 border-b border-base-300 last:border-none">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium">{p.opt.name || p.optName}</label>
          <Show when={p.opt.description}>
            <div
              class="tooltip tooltip-right"
              data-tip={
                Array.isArray(p.opt.description)
                  ? p.opt.description.join(" ")
                  : p.opt.description
              }
            >
              <span class="btn btn-ghost btn-xs btn-circle opacity-50">?</span>
            </div>
          </Show>
        </div>
        <div class="flex items-center">
          {(() => {
            switch (p.opt.type) {
              case "boolean":
                return (
                  <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-primary"
                    checked={String(value()) === "true"}
                    onChange={(e) =>
                      updateOption(p.optName, String(e.currentTarget.checked))
                    }
                  />
                );
              case "integer":
                return (
                  <input
                    type="number"
                    class="input input-bordered input-sm w-24"
                    value={value()}
                    onInput={(e) =>
                      updateOption(
                        p.optName,
                        parseInt(e.currentTarget.value, 10),
                      )
                    }
                  />
                );
              case "option":
                return (
                  <select
                    class="select select-bordered select-sm w-32"
                    value={String(value() ?? "")}
                    onChange={(e) =>
                      updateOption(p.optName, e.currentTarget.value)
                    }
                  >
                    <For each={p.opt.options || []}>
                      {(o) => <option value={o}>{o}</option>}
                    </For>
                  </select>
                );
              default:
                return (
                  <input
                    type="text"
                    class="input input-bordered input-sm w-32"
                    value={String(value() ?? "")}
                    onInput={(e) =>
                      updateOption(p.optName, e.currentTarget.value)
                    }
                  />
                );
            }
          })()}
        </div>
      </div>
    );
  };

  return (
    <div class="h-full flex flex-col overflow-hidden">
      <div class="flex items-center justify-between mb-6 shrink-0">
        <h2 class="text-2xl font-bold">
          {t(`nav.settings.${props.activeSubTab || "basicOptions"}`)() ||
            props.activeSubTab ||
            "basicOptions"}
        </h2>
      </div>

      <div class="flex-1 overflow-y-auto pr-2">
        <div class="max-w-4xl mx-auto">
          <div class="card bg-base-100 shadow-sm border border-base-300">
            <div class="card-body">
              <div class="space-y-1">
                <For
                  each={
                    aria2GlobalAvailableOptions[
                      props.activeSubTab || "basicOptions"
                    ] || aria2GlobalAvailableOptions["basicOptions"]
                  }
                >
                  {(optName: string) => {
                    const opt =
                      aria2AllOptions[optName as keyof typeof aria2AllOptions];
                    if (!opt) return null;
                    return <OptionItem optName={optName} opt={opt} />;
                  }}
                </For>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionSettings;
