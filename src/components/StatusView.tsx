import { type Component, createResource, Show, For } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";

const StatusView: Component = () => {
  const state = aria2Store.getState();
  const [statusInfo, { refetch }] = createResource(
    () => state.connectionStatus,
    async (status) => {
      if (status === "connected") {
        try {
          const [serverInfo, sessionInfo, notifications] = await Promise.all([
            aria2Store.getServerInfo(),
            aria2Store.getSessionInfo().catch(() => ({ sessionId: "N/A" })),
            aria2Store.listNotifications().catch(() => []),
          ]);
          return {
            version: serverInfo?.version || "-",
            enabledFeatures: serverInfo?.enabledFeatures || [],
            sessionId: sessionInfo?.sessionId || "N/A",
            notifications: notifications || [],
          };
        } catch (e) {
          console.error(e);
          return null;
        }
      }
      return null;
    },
  );

  return (
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">Aria2 Status</h2>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat bg-base-100 shadow-sm border border-base-300">
          <div class="stat-title">{t("status.rpcAddress")()}</div>
          <div class="stat-value text-xs truncate max-w-[15rem]" title={state.rpcProfiles.find((p) => p.id === state.currentProfileId)?.config.url || "-"}>
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
              when={!statusInfo.loading}
              fallback={<span class="animate-pulse">Loading...</span>}
            >
              {statusInfo()?.version || "-"}
            </Show>
          </div>
        </div>

        <div class="stat bg-base-100 shadow-sm border border-base-300">
          <div class="stat-title">Session ID</div>
          <div class="stat-value text-xs truncate max-w-[12rem]" title={statusInfo()?.sessionId || "-"}>
            <Show
              when={!statusInfo.loading}
              fallback={<span class="animate-pulse">Loading...</span>}
            >
              {statusInfo()?.sessionId || "-"}
            </Show>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body">
            <h3 class="card-title text-lg mb-4">Enabled Features</h3>
            <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              <Show
                when={!statusInfo.loading}
                fallback={<span class="animate-pulse">Loading...</span>}
              >
                <For each={statusInfo()?.enabledFeatures || []}>
                  {(feature) => (
                    <div class="badge badge-ghost border-base-300">{feature}</div>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body">
            <h3 class="card-title text-lg mb-4">Event Notifications</h3>
            <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              <Show
                when={!statusInfo.loading}
                fallback={<span class="animate-pulse">Loading...</span>}
              >
                <For each={statusInfo()?.notifications || []}>
                  {(notify) => (
                    <div class="badge badge-outline badge-primary text-[10px]">{notify}</div>
                  )}
                </For>
              </Show>
            </div>
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
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-error btn-outline flex items-center gap-1">
            Shutdown Options
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-48 p-2 shadow border border-base-300 mt-1">
            <li>
              <button
                onClick={async () => {
                  await aria2Store.shutdown();
                  refetch();
                }}
                class="text-error"
              >
                Shutdown Gracefully
              </button>
            </li>
            <li>
              <button
                onClick={async () => {
                  await aria2Store.forceShutdown();
                  refetch();
                }}
                class="text-error font-bold"
              >
                Force Shutdown
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StatusView;
