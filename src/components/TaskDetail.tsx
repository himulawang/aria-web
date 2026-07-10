import {
  type Component,
  Show,
  createSignal,
  createEffect,
  For,
} from "solid-js";
import { Portal } from "solid-js/web";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { formatSize, formatSpeed } from "../utils/format";
import { parsePeerId, calculatePeerProgress } from "../utils/peer";
import TaskEditDialog from "./TaskEditDialog";
import ExportCommandDialog from "./ExportCommandDialog";

const TaskDetail: Component = () => {
  const state = aria2Store.getState();
  const [activeTab, setActiveTab] = createSignal("overview");
  const [peers, setPeers] = createSignal<any[]>([]);
  const [isEditing, setIsEditing] = createSignal(false);
  const [isExporting, setIsExporting] = createSignal(false);
  const [selectedIndices, setSelectedIndices] = createSignal<Set<number>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = createSignal(false);

  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [forceDeleteChecked, setForceDeleteChecked] = createSignal(false);

  const handleConfirmDelete = () => {
    const gid = state.selectedTaskDetail!.gid;
    if (forceDeleteChecked()) {
      aria2Store.forceRemoveTask(gid);
    } else {
      aria2Store.removeTask(gid);
    }
    aria2Store.setSelectedTask(null);
    setShowDeleteConfirm(false);
  };

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

  // Fetch selection state when tab changes to 'files'
  createEffect(async () => {
    const gid = state.selectedTaskDetail?.gid;
    if (activeTab() === "files" && gid) {
      try {
        const val = await aria2Store.getTaskOption(gid, "select-file");
        if (val && typeof val === "string" && val.trim() !== "") {
          const indices = new Set(
            val.split(",")
               .flatMap(part => {
                 if (part.includes("-")) {
                   const [start, end] = part.split("-").map(Number);
                   return Array.from({length: end - start + 1}, (_, i) => start + i);
                 }
                 return [Number(part)];
               })
               .filter(n => !isNaN(n))
          );
          setSelectedIndices(indices);
        } else {
          setSelectedIndices(new Set<number>());
        }
      } catch (e) {
        console.error(`Failed to fetch select-file option: ${e}`);
      }
    }
  });

  const toggleFileSelection = async (index: number) => {
    const current = new Set(selectedIndices());
    if (current.has(index)) {
      current.delete(index);
    } else {
      current.add(index);
    }
    setSelectedIndices(current);
    
    const gid = state.selectedTaskDetail?.gid;
    if (gid) {
      const indicesString = Array.from(current).sort((a, b) => a - b).join(",");
      await aria2Store.changeTaskOption(gid, { "select-file": indicesString });
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
                  {state.selectedTaskDetail?.files?.map((file: any, index: number) => (
                    <div 
                      class={`p-3 rounded-lg text-xs space-y-2 cursor-pointer transition-colors ${selectedIndices().has(index) ? 'bg-primary/20 border border-primary/30' : 'bg-base-200'}`}
                      onClick={() => toggleFileSelection(index)}
                    >
                      <div class="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={selectedIndices().has(index)} 
                          onChange={() => {}} 
                          class="checkbox checkbox-xs"
                        />
                        <div class="font-bold">{file.path.split("/").pop()}</div>
                      </div>
                      <div class="text-[10px] opacity-70 break-all whitespace-normal pl-6">
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
              onClick={() => setIsExporting(true)}
              class="btn btn-ghost btn-outline"
            >
              {t("task-detail.show-api")()}
            </button>
            <button
              onClick={() => {
                if (isShiftPressed()) {
                  const gid = state.selectedTaskDetail!.gid;
                  aria2Store.forceRemoveTask(gid);
                  aria2Store.setSelectedTask(null);
                } else {
                  setForceDeleteChecked(false);
                  setShowDeleteConfirm(true);
                }
              }}
              class={`btn btn-error btn-outline transition-all ${
                isShiftPressed() ? "bg-error text-error-content" : ""
              }`}
              title={isShiftPressed() ? "Force Delete Task (Shift-click)" : "Delete Task"}
            >
              {isShiftPressed() ? "Force Delete" : t("common.delete")()}
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
      <Show when={isExporting()}>
        <ExportCommandDialog 
          isOpen={isExporting()} 
          onClose={() => setIsExporting(false)} 
          task={state.selectedTaskDetail} 
        />
      </Show>

      <Show when={showDeleteConfirm()}>
        <Portal>
          <div class="modal modal-open z-50">
            <div class="modal-box w-11/12 max-w-md">
              <h3 class="font-bold text-lg text-error mb-4">Confirm Delete</h3>
              <p class="text-sm opacity-90">
                Are you sure you want to delete this task?
              </p>
              
              <div class="form-control mt-4">
                <label class="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-error checkbox-sm"
                    checked={forceDeleteChecked()}
                    onChange={(e) => setForceDeleteChecked(e.currentTarget.checked)}
                  />
                  <span class="label-text text-sm">Force delete immediately (skip tracker handshake)</span>
                </label>
              </div>

              <div class="modal-action">
                <button
                  class="btn btn-sm btn-ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  class="btn btn-sm btn-error"
                  onClick={handleConfirmDelete}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
            <div
              class="modal-backdrop bg-black/40"
              onClick={() => setShowDeleteConfirm(false)}
            ></div>
          </div>
        </Portal>
      </Show>
    </Show>
  );
};

export default TaskDetail;
