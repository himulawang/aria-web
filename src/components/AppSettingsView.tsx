import { type Component, createSignal, For, Show } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import "./styles/app-settings.css";

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
    <div class="app-settings-container">
      <h2 class="app-settings-title">{t("app.settings.title")()}</h2>

      <div class="app-settings-section">
        <h3>{t("app.settings.general")()}</h3>
        <div class="app-settings-group">
          <label>{t("app.settings.language")()}</label>
          <select
            value={state.appSettings.language}
            onChange={(e) => updateSetting("language", e.currentTarget.value)}
          >
            <option value="en">{t("lang.en")()}</option>
            <option value="zh-cn">{t("lang.zh-cn")()}</option>
          </select>
        </div>
        <div class="app-settings-group">
          <label>{t("app.settings.theme")()}</label>
          <select
            value={state.appSettings.theme}
            onChange={(e) => updateSetting("theme", e.currentTarget.value)}
          >
            <option value="light">{t("app.settings.light")()}</option>
            <option value="dark">{t("app.settings.dark")()}</option>
            <option value="system">{t("app.settings.system")()}</option>
          </select>
        </div>
      </div>

      <div class="app-settings-section">
        <h3>{t("app.settings.notifications")()}</h3>
        <div class="app-settings-group">
          <label>{t("app.settings.browserNotification")()}</label>
          <input
            type="checkbox"
            checked={state.appSettings.browserNotification}
            onChange={(e) =>
              updateSetting("browserNotification", e.currentTarget.checked)
            }
          />
        </div>
        <div class="app-settings-group">
          <label>{t("app.settings.notificationSound")()}</label>
          <input
            type="checkbox"
            checked={state.appSettings.browserNotificationSound}
            onChange={(e) =>
              updateSetting("browserNotificationSound", e.currentTarget.checked)
            }
          />
        </div>
      </div>

      <div class="app-settings-section">
        <h3>{t("app.settings.refreshIntervals")()}</h3>
        <div class="app-settings-group">
          <label>{t("app.settings.globalStatRefresh")()}</label>
          <input
            type="number"
            value={state.appSettings.globalStatRefreshInterval}
            onInput={(e) =>
              updateSetting(
                "globalStatRefreshInterval",
                parseInt(e.currentTarget.value),
              )
            }
          />
        </div>
        <div class="app-settings-group">
          <label>{t("app.settings.taskListRefresh")()}</label>
          <input
            type="number"
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

      <div class="app-settings-section">
        <h3>{t("app.settings.uiBehavior")()}</h3>
        <div class="app-settings-group">
          <label>{t("app.settings.dragAndDropTasks")()}</label>
          <input
            type="checkbox"
            checked={state.appSettings.dragAndDropTasks}
            onChange={(e) =>
              updateSetting("dragAndDropTasks", e.currentTarget.checked)
            }
          />
        </div>
        <div class="app-settings-group">
          <label>{t("app.settings.keyboardShortcuts")()}</label>
          <input
            type="checkbox"
            checked={state.appSettings.keyboardShortcuts}
            onChange={(e) =>
              updateSetting("keyboardShortcuts", e.currentTarget.checked)
            }
          />
        </div>
      </div>

      <div class="app-settings-section">
        <h3>{t("app.settings.importExport")()}</h3>
        <div class="app-settings-group">
          <button class="btn btn-secondary" onClick={handleExport}>
            {t("app.settings.export")()}
          </button>
        </div>
        <div class="app-settings-group">
          <input
            type="text"
            placeholder={t("app.settings.importPlaceholder")()}
            value={importText()}
            onInput={(e) => setImportText(e.currentTarget.value)}
            class="status-view-input"
          />
          <button class="btn btn-secondary" onClick={handleImport}>
            {t("app.settings.import")()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppSettingsView;
