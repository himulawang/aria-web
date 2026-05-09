import { type Component, createResource, Show, For } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import "./styles/status-view.css";

const StatusView: Component = () => {
  const state = aria2Store.getState();
  const [serverInfo, { refetch }] = createResource(
    () => state.connectionStatus,
    async (status) => {
      if (status === "connected") {
        return await aria2Store.getServerInfo();
      }
      return null;
    },
  );

  return (
    <div class="status-view-container">
      <div class="status-view-content">
        <h2 class="status-view-title">Aria2 Status</h2>
        <div class="status-view-group">
          <label class="status-view-label">{t("status.rpcAddress")()}</label>
          <input
            type="text"
            value={
              state.rpcProfiles.find((p) => p.id === state.currentProfileId)
                ?.config.url || ""
            }
            disabled
            class="status-view-input"
          />
        </div>
        <div class="status-view-group">
          <label class="status-view-label">Aria2 Status</label>
          <div
            class={`status-label ${
              state.connectionStatus === "connected"
                ? "label-success"
                : "label-danger"
            }`}
          >
            {state.connectionStatus}
          </div>
        </div>
        <div class="status-view-group">
          <label class="status-view-label">Aria2 Version</label>
          <Show
            when={!serverInfo.loading}
            fallback={<span class="status-view-value">Loading...</span>}
          >
            <span class="status-view-value">
              {serverInfo()?.version || "-"}
            </span>
          </Show>
        </div>
        <div class="status-view-group">
          <label class="status-view-label">Enabled Features</label>
          <Show
            when={!serverInfo.loading}
            fallback={<span class="status-view-value">Loading...</span>}
          >
            <div class="status-view-value">
              <For each={serverInfo()?.enabledFeatures || []}>
                {(feature) => (
                  <div>
                    <input type="checkbox" checked disabled /> {feature}
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
        <div class="status-view-buttons">
          <button
            onClick={() => aria2Store.saveSession()}
            class="btn btn-success"
          >
            Save Session
          </button>
          <button
            onClick={async () => {
              await aria2Store.shutdown();
              refetch();
            }}
            class="btn btn-secondary"
          >
            Shutdown Aria2
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusView;
