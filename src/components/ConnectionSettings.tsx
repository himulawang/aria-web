import { type Component, createSignal, For, Show, onMount } from "solid-js";
import { aria2Store } from "../store";
import { notificationStore } from "../store/notification-store";
import { t } from "../i18n";
import { aria2AllOptions } from "../config/aria2-options";
import { aria2GlobalAvailableOptions } from "../config/aria2-available-options";
import { settingsHistory } from "../utils/settings-history";
import SettingItem from "./SettingItem";

interface ConnectionSettingsProps {
  activeSubTab: string | null;
  setActiveSubTab: (tab: string | null) => void;
}

const ConnectionSettings: Component<ConnectionSettingsProps> = (props) => {
  const [optionValues, setOptionValues] = createSignal<Record<string, any>>({});

  const updateOption = async (name: string, value: any) => {
    setOptionValues({ ...optionValues(), [name]: value });
    try {
      await aria2Store.changeGlobalOption(name, value);
      await settingsHistory.addHistory(name, String(value));
      notificationStore.add(`Updated ${name}`, "success");
    } catch (e) {
      notificationStore.add(`Failed to update ${name}`, "error");
    }
  };

  onMount(async () => {
    try {
      const allOptions = await aria2Store.requestSafe(
        "aria2.getGlobalOption",
        [],
      );
      if (typeof allOptions === "object" && allOptions !== null) {
        setOptionValues(allOptions as Record<string, any>);
      }
    } catch (e) {
      notificationStore.add("Failed to load global options", "error");
    }
  });

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
                    return (
                      <SettingItem 
                        optName={optName} 
                        opt={opt} 
                        value={() => optionValues()[optName]}
                        onUpdate={updateOption} 
                      />
                    );
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
