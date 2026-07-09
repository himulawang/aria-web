import { SUPPORTED_LANGUAGES } from "../i18n/languages";
import { type Component, createSignal, For } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";

const AppSettingsView: Component = () => {
  const state = aria2Store.getState();
  const [importText, setImportText] = createSignal("");

  const updateSetting = async (key: string, value: any) => {
    await aria2Store.updateAppSettings({ [key]: value });
  };

  const handleExport = async () => {
    const json = await aria2Store.exportSettings();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aria-web-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    try {
      await aria2Store.importSettings(importText());
      setImportText("");
    } catch (e) {
      // Notification is handled in store
    }
  };

  return (
    <div class="h-full flex flex-col overflow-hidden">
      <div class="flex items-center justify-between mb-6 shrink-0">
        <h2 class="text-2xl font-bold">{t("app.settings.title")()}</h2>
      </div>

      <div class="flex-1 overflow-y-auto pr-2">
        <div class="max-w-4xl mx-auto space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Section */}
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body">
                <h3 class="card-title text-lg mb-4">
                  {t("app.settings.general")()}
                </h3>
                <div class="space-y-4">
                  <div class="form-control w-full">
                    <label class="label">
                      <span class="label-text">
                        {t("app.settings.language")()}
                      </span>
                    </label>
                    <select
                      class="select select-bordered w-full"
                      value={state.appSettings.language}
                      onChange={(e) =>
                        updateSetting("language", e.currentTarget.value)
                      }
                    >
                      <option value="en">{t("lang.en")()}</option>
                      <option value="zh-cn">{t("lang.zh-cn")()}</option>
                    </select>
                  </div>
                  <div class="form-control w-full">
                    <label class="label">
                      <span class="label-text">
                        {t("app.settings.theme")()}
                      </span>
                    </label>
                    <select
                      class="select select-bordered w-full"
                      value={state.appSettings.theme}
                      onChange={(e) =>
                        updateSetting("theme", e.currentTarget.value)
                      }
                    >
                      <option value="light">{t("app.settings.light")()}</option>
                      <option value="dark">{t("app.settings.dark")()}</option>
                      <option value="system">
                        {t("app.settings.system")()}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body">
                <h3 class="card-title text-lg mb-4">
                  {t("app.settings.notifications")()}
                </h3>
                <div class="space-y-4">
                  <div class="form-control">
                    <label class="label cursor-pointer">
                      <span class="label-text">
                        {t("app.settings.browserNotification")()}
                      </span>
                      <input
                        type="checkbox"
                        class="toggle toggle-primary"
                        checked={state.appSettings.browserNotification}
                        onChange={(e) =>
                          updateSetting(
                            "browserNotification",
                            e.currentTarget.checked,
                          )
                        }
                      />
                    </label>
                  </div>
                  <div class="form-control">
                    <label class="label cursor-pointer">
                      <span class="label-text">
                        {t("app.settings.notificationSound")()}
                      </span>
                      <input
                        type="checkbox"
                        class="toggle toggle-primary"
                        checked={state.appSettings.browserNotificationSound}
                        onChange={(e) =>
                          updateSetting(
                            "browserNotificationSound",
                            e.currentTarget.checked,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Refresh Intervals Section */}
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body">
                <h3 class="card-title text-lg mb-4">
                  {t("app.settings.refreshIntervals")()}
                </h3>
                <div class="space-y-4">
                  <div class="form-control w-full">
                    <label class="label">
                      <span class="label-text">
                        {t("app.settings.globalStatRefresh")()}
                      </span>
                    </label>
                    <input
                      type="number"
                      class="input input-bordered w-full"
                      value={state.appSettings.globalStatRefreshInterval}
                      onInput={(e) =>
                        updateSetting(
                          "globalStatRefreshInterval",
                          parseInt(e.currentTarget.value),
                        )
                      }
                    />
                  </div>
                  <div class="form-control w-full">
                    <label class="label">
                      <span class="label-text">
                        {t("app.settings.taskListRefresh")()}
                      </span>
                    </label>
                    <input
                      type="number"
                      class="input input-bordered w-full"
                      value={state.appSettings.downloadTaskRefreshInterval}
                      onInput={(e) =>
                        updateSetting(
                          "downloadTaskRefreshInterval",
                          parseInt(e.currentTarget.value),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* UI Behavior Section */}
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body">
                <h3 class="card-title text-lg mb-4">
                  {t("app.settings.uiBehavior")()}
                </h3>
                <div class="space-y-4">
                  <div class="form-control">
                    <label class="label cursor-pointer">
                      <span class="label-text">
                        {t("app.settings.dragAndDropTasks")()}
                      </span>
                      <input
                        type="checkbox"
                        class="toggle toggle-primary"
                        checked={state.appSettings.dragAndDropTasks}
                        onChange={(e) =>
                          updateSetting(
                            "dragAndDropTasks",
                            e.currentTarget.checked,
                          )
                        }
                      />
                    </label>
                  </div>
                  <div class="form-control">
                    <label class="label cursor-pointer">
                      <span class="label-text">
                        {t("app.settings.keyboardShortcuts")()}
                      </span>
                      <input
                        type="checkbox"
                        class="toggle toggle-primary"
                        checked={state.appSettings.keyboardShortcuts}
                        onChange={(e) =>
                          updateSetting(
                            "keyboardShortcuts",
                            e.currentTarget.checked,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Import/Export Section */}
          <div class="card bg-base-100 shadow-sm border border-base-300">
            <div class="card-body">
              <h3 class="card-title text-lg mb-4">
                {t("app.settings.importExport")()}
              </h3>
              <div class="flex flex-col md:flex-row gap-4 items-end">
                <div class="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder={t("app.settings.importPlaceholder")()}
                    value={importText()}
                    onInput={(e) => setImportText(e.currentTarget.value)}
                    class="input input-bordered flex-1"
                  />
                  <button class="btn btn-primary" onClick={handleImport}>
                    {t("app.settings.import")()}
                  </button>
                </div>
                <button class="btn btn-outline" onClick={handleExport}>
                  {t("app.settings.export")()}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSettingsView;
