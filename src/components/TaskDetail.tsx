import {
  type Component,
  Show,
  createSignal,
  createEffect,
  For,
} from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { formatSize, formatSpeed } from "../utils/format";
import { parsePeerId, calculatePeerProgress } from "../utils/peer";
import TaskEditDialog from "./TaskEditDialog";

const TaskDetail: Component = () => {
  const state = aria2Store.getState();
  const [activeTab, setActiveTab] = createSignal("overview");
  const [peers, setPeers] = createSignal<any[]>([]);
  const [isActionLoading, setIsActionLoading] = createSignal(false);
  const [isEditing, setIsEditing] = createSignal(false);

  // Fetch peers when tab changes to 'peers'
  createEffect(() => {
    if (activeTab() === "peers" && state.selectedTaskDetail?.gid) {
      setPeers([]); // Clear previous peers immediately
      aria2Store.getPeers(state.selectedTaskDetail.gid).then((p) => {
        if (p) setPeers(p);
      });
    } else {
      setPeers([]);
    }
  });

  const handleAction = async (action: "pause" | "resume") => {
    setIsActionLoading(true);
    const task = state.selectedTaskDetail;
    if (task) {
      if (action === "pause") await aria2Store.pauseTask(task.gid);
      else await aria2Store.resumeTask(task.gid);
    }
    setIsActionLoading(false);
  };

  const handleSpeedChange = async (type: "down" | "up", value: string) => {
    const task = state.selectedTaskDetail;
    if (!task) return;
    const limit = parseInt(value) * 1024; // Convert KB to bytes
    if (isNaN(limit)) return;

    if (type === "down") {
      await aria2Store.limitDownloadSpeed(task.gid, limit);
    } else {
      await aria2Store.limitUploadSpeed(task.gid, limit);
    }
  };

  let detailRef: HTMLDivElement | undefined;

  // Click outside to close
  createEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        detailRef &&
        !detailRef.contains(e.target as Node) &&
        state.selectedTaskDetail
      ) {
        aria2Store.setSelectedTask(null);
      }
    };

    if (state.selectedTaskDetail) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  });

  return (
    <Show when={state.selectedTaskDetail}>
      <div
        ref={detailRef}
        class="fixed top-20 right-4 w-96 max-h-[calc(100vh-6rem)] overflow-y-auto card bg-base-100 shadow-xl border border-base-300 p-6 z-50"
      >
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold">{t("task-detail.title")()}</h2>
            <div
              class={`badge ${
                state.selectedTaskDetail?.status === "active"
                  ? "badge-primary"
                  : "badge-ghost"
              }`}
            >
              {t(`task-status.${state.selectedTaskDetail?.status}`)()}
            </div>
          </div>

          <div class="tabs tabs-boxed">
            <button
              class={`tab ${activeTab() === "overview" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              {t("task-detail.tabs.overview")()}
            </button>
            <button
              class={`tab ${activeTab() === "peers" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("peers")}
            >
              {t("task-detail.tabs.peers")()}
            </button>
            <button
              class={`tab ${activeTab() === "files" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("files")}
            >
              {t("task-detail.tabs.files")()}
            </button>
          </div>

          <Show when={activeTab() === "overview"}>
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body p-0">
                <table class="table w-full">
                  <tbody>
                    <tr>
                      <th class="text-xs opacity-50 w-1/3">
                        {t("task-detail.fileName")()}
                      </th>
                      <td class="text-xs break-words whitespace-normal">
                        {state.selectedTaskDetail?.files?.[0]?.path
                          ?.split("/")
                          .pop() || t("task-status.unknown")()}
                      </td>
                    </tr>
                    <tr>
                      <th class="text-xs opacity-50 w-1/3">
                        {t("task-detail.directory")()}
                      </th>
                      <td class="text-xs break-words whitespace-normal">
                        {state.selectedTaskDetail?.dir}
                      </td>
                    </tr>
                    <tr>
                      <th class="text-xs opacity-50">
                        {t("task-detail.progress")()}
                      </th>
                      <td>
                        <div class="flex items-center gap-3">
                          <progress
                            class="progress progress-primary w-full max-w-xs"
                            value={state.selectedTaskDetail!.completedLength}
                            max={state.selectedTaskDetail!.totalLength || 1}
                          ></progress>
                          <span class="text-xs w-8">
                            {Math.round(
                              (state.selectedTaskDetail!.completedLength /
                                (state.selectedTaskDetail!.totalLength || 1)) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <th class="text-xs opacity-50">
                        {t("task-detail.totalSize")()}
                      </th>
                      <td class="text-sm">
                        {formatSize(
                          Number(state.selectedTaskDetail!.totalLength),
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Show>

          <Show when={activeTab() === "peers"}>
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body p-0">
                <table class="table w-full">
                  <thead>
                    <tr>
                      <th class="text-xs">IP</th>
                      <th class="text-xs">Port</th>
                      <th class="text-xs">Client</th>
                      <th class="text-xs">DL</th>
                      <th class="text-xs">UL</th>
                      <th class="text-xs">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={peers()}>
                      {(peer) => (
                        <tr>
                          <td class="text-xs font-mono">{peer.ip}</td>
                          <td class="text-xs">{peer.port}</td>
                          <td class="text-xs">{parsePeerId(peer.peerId)}</td>
                          <td class="text-xs">
                            {formatSpeed(Number(peer.downloadSpeed))}
                          </td>
                          <td class="text-xs">
                            {formatSpeed(Number(peer.uploadSpeed))}
                          </td>
                          <td class="text-xs">
                            {calculatePeerProgress(peer.bitfield, state.selectedTaskDetail?.numPieces)}
                            %
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </Show>

          <Show when={activeTab() === "files"}>
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body">
                <h4 class="text-sm font-bold mb-4">
                  {t("task-detail.files")()}
                </h4>
                <div class="space-y-4">
                  {state.selectedTaskDetail?.files?.map((file: any) => (
                    <div class="p-3 bg-base-200 rounded-lg text-xs space-y-2">
                      <div class="font-bold">{file.path.split("/").pop()}</div>
                      <div class="text-[10px] opacity-70 break-all whitespace-normal">
                        {file.uris?.map((u: any) => (
                          <div class="mb-1">
                            {u.uri} ({u.status})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Show>

          <div class="flex gap-2 pt-4">
            <button
              onClick={() => setIsEditing(true)}
              class="btn btn-primary btn-outline"
            >
              {t("task-detail.edit")()}
            </button>
            <button
              onClick={() => {
                aria2Store.removeTask(state.selectedTaskDetail!.gid);
                aria2Store.setSelectedTask(null);
              }}
              class="btn btn-error btn-outline"
            >
              {t("common.delete")()}
            </button>
          </div>
        </div>
      </div>
      <Show when={isEditing()}>
        <TaskEditDialog
          gid={state.selectedTaskDetail!.gid}
          initialOptions={{
            dir: state.selectedTaskDetail?.dir,
            out: state.selectedTaskDetail?.out,
            split: state.selectedTaskDetail?.split,
          }}
        />
      </Show>
    </Show>
  );
};

export default TaskDetail;
