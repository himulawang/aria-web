import { type Component, createResource, Show, For } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";

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
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">Aria2 Status</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="stat bg-base-100 shadow-sm border border-base-300">
          <div class="stat-title">{t("status.rpcAddress")()}</div>
          <div class="stat-value text-sm truncate">
            {state.rpcProfiles.find((p) => p.id === state.currentProfileId)
              ?.config.url || "-"}
          </div>
        </div>

        <div class="stat bg-base-100 shadow-sm border border-base-300">
          <div class="stat-title">Aria2 Status</div>
          <div class="stat-value text-sm">
            <div
              class={`badge ${
                state.connectionStatus === "connected"
                  ? "badge-success"
                  : "badge-error"
              }`}
            >
              {state.connectionStatus}
            </div>
          </div>
        </div>

        <div class="stat bg-base-100 shadow-sm border border-base-300">
          <div class="stat-title">Aria2 Version</div>
          <div class="stat-value text-sm">
            <Show
              when={!serverInfo.loading}
              fallback={<span class="animate-pulse">Loading...</span>}
            >
              {serverInfo()?.version || "-"}
            </Show>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body">
          <h3 class="card-title text-lg mb-4">Enabled Features</h3>
          <div class="flex flex-wrap gap-2">
            <Show
              when={!serverInfo.loading}
              fallback={<span class="animate-pulse">Loading...</span>}
            >
              <For each={serverInfo()?.enabledFeatures || []}>
                {(feature) => (
                  <div class="badge badge-ghost border-base-300">{feature}</div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-4">
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
          class="btn btn-error btn-outline"
        >
          Shutdown Aria2
        </button>
      </div>
    </div>
  );
};

export default StatusView;
