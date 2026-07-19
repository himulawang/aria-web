import { type Component, For } from "solid-js";
import { formatSpeed } from "../../utils/format";

interface TaskServersProps {
  servers: any[];
}

export const TaskServers: Component<TaskServersProps> = (props) => {
  return (
    <div class="space-y-3">
      <span class="text-xs font-semibold opacity-70 block mb-1">
        Active Connections ({props.servers.reduce((acc, curr) => acc + (curr.servers?.length || 0), 0)})
      </span>
      <div class="space-y-3 max-h-72 overflow-y-auto pr-1">
        <For
          each={props.servers}
          fallback={
            <div class="text-center py-8 opacity-50 text-xs">
              No active server connections.
            </div>
          }
        >
          {(serverGroup) => (
            <div class="p-3 bg-base-200/40 border border-base-300/40 rounded-xl space-y-2">
              <div class="text-[10px] font-bold opacity-60">File Index: {serverGroup.index}</div>
              <For each={serverGroup.servers}>
                {(srv) => (
                  <div class="p-2.5 bg-base-100 rounded-lg text-xs border border-base-200/80 space-y-1.5">
                    <div class="font-medium break-all font-mono text-[10px] text-primary/95 leading-tight">
                      {srv.uri}
                    </div>
                    <div class="flex items-center justify-between text-[10px] pt-0.5 border-t border-base-200/50">
                      <span class="opacity-80">Speed: <strong class="text-success font-semibold">{formatSpeed(Number(srv.downloadSpeed))}</strong></span>
                      <span
                        class={`badge badge-[9px] py-1 px-1.5 font-bold ${
                          srv.currentConnection === "true"
                            ? "badge-success text-success-content"
                            : "badge-ghost opacity-60"
                        }`}
                      >
                        {srv.currentConnection === "true" ? "CONNECTED" : "IDLE"}
                      </span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
