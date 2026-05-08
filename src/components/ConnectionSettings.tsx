import { type Component, createSignal, For, Show, onMount } from "solid-js";
import { aria2Store } from "../store";
import { notificationStore } from "../store/notification-store";
import { t } from "../i18n";
import { aria2AllOptions } from "../config/aria2-options";
import { aria2GlobalAvailableOptions } from "../config/aria2-available-options";
import "./styles/connection-settings.css";

interface ConnectionSettingsProps {
  activeSubTab: string | null;
  setActiveSubTab: (tab: string | null) => void;
}

const ConnectionSettings: Component<ConnectionSettingsProps> = (props) => {
  const state = aria2Store.getState();
  const [optionValues, setOptionValues] = createSignal<Record<string, any>>({});
  const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });

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
      <div class="connection-settings-option-item">
        <div class="label-wrapper">
          <label class="connection-settings-option-label">
            {p.opt.name || p.optName}
          </label>
          <Show when={p.opt.description}>
            <div
              class="tooltip-container"
              onMouseMove={(e) =>
                setMousePos({
                  x: e.clientX + 15,
                  y: e.clientY + 15,
                })
              }
            >
              <span class="tooltip-icon">?</span>
              <span
                class="tooltip-text"
                style={{
                  top: `${mousePos().y}px`,
                  left: `${mousePos().x}px`,
                }}
              >
                {Array.isArray(p.opt.description)
                  ? p.opt.description.join(" ")
                  : p.opt.description}
              </span>
            </div>
          </Show>
        </div>
        {(() => {
          switch (p.opt.type) {
            case "boolean":
              return (
                <input
                  type="checkbox"
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
                  value={value()}
                  onInput={(e) =>
                    updateOption(p.optName, parseInt(e.currentTarget.value, 10))
                  }
                  class="connection-settings-option-input"
                />
              );
            case "option":
              return (
                <select
                  value={String(value() ?? "")}
                  onChange={(e) =>
                    updateOption(p.optName, e.currentTarget.value)
                  }
                  class="connection-settings-option-input"
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
                  value={String(value() ?? "")}
                  onInput={(e) =>
                    updateOption(p.optName, e.currentTarget.value)
                  }
                  class="connection-settings-option-input"
                />
              );
          }
        })()}
      </div>
    );
  };

  return (
    <div class="connection-settings-container">
      <div class="connection-settings-options-container">
        <div class="options-layout">
          <div class="options-main">
            <div class="connection-settings-category">
              <h3 class="connection-settings-category-title">
                {t(`nav.settings.${props.activeSubTab || "basicOptions"}`)() ||
                  props.activeSubTab ||
                  "basicOptions"}
              </h3>
              <div class="connection-settings-options-list">
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
