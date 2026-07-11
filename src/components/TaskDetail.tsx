import {
  type Component,
  Show,
  createSignal,
  createEffect,
  For,
  onCleanup,
} from "solid-js";
import { Portal } from "solid-js/web";
import { aria2Store } from "../store";
import { notificationStore } from "../store/notification-store";
import { t } from "../i18n";
import { formatSize, formatSpeed } from "../utils/format";
import { parsePeerId, calculatePeerProgress } from "../utils/peer";
import TaskEditDialog from "./TaskEditDialog";
import ExportCommandDialog from "./ExportCommandDialog";
import { HiOutlineXMark } from "solid-icons/hi";

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

  const [servers, setServers] = createSignal<any[]>([]);
  const [manageUrisFileIndex, setManageUrisFileIndex] = createSignal<number | null>(null);
  const [newUrisInput, setNewUrisInput] = createSignal("");
  const [urisToDelete, setUrisToDelete] = createSignal<Set<string>>(new Set());

  const handleToggleUriDelete = (uri: string) => {
    const next = new Set<string>(urisToDelete());
    if (next.has(uri)) {
      next.delete(uri);
    } else {
      next.add(uri);
    }
    setUrisToDelete(next);
  };

  const handleSaveUris = async () => {
    const fileIdx = manageUrisFileIndex();
    if (fileIdx === null) return;

    const gid = state.selectedTaskDetail?.gid;
    if (!gid) return;

    const delUris = Array.from(urisToDelete());
    const addUris = newUrisInput()
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    try {
      await aria2Store.changeUri(gid, fileIdx + 1, delUris, addUris);
      notificationStore.add("URIs updated successfully", "success");
      await aria2Store.fetchTaskDetail(gid);
    } catch (err) {
      notificationStore.add(`Failed to update URIs: ${err}`, "error");
    } finally {
      setManageUrisFileIndex(null);
      setNewUrisInput("");
      setUrisToDelete(new Set<string>());
    }
  };

  // Fetch servers when tab changes to 'servers'
  createEffect(() => {
    let timer: any = null;
    const gid = state.selectedTaskDetail?.gid;

    if (activeTab() === "servers" && gid && !state.selectedTaskDetail?.bittorrent) {
      setServers([]);

      const fetch = () => {
        aria2Store.getServers(gid).then((s) => {
          if (s) setServers(s);
        });
      };

      fetch();
      timer = setInterval(fetch, 2500);
    } else {
      setServers([]);
    }

    onCleanup(() => {
      if (timer) clearInterval(timer);
    });
  });

  // Reset tab to overview if task changes to BT and current tab is servers
  createEffect(() => {
    const isBt = !!state.selectedTaskDetail?.bittorrent;
    if (isBt && activeTab() === "servers") {
      setActiveTab("overview");
    }
  });

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
            <div class="flex items-center gap-2">
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
            <button
              onClick={() => aria2Store.setSelectedTask(null)}
              class="btn btn-sm btn-ghost btn-circle"
              title={t("common.close")() || "Close"}
            >
              <HiOutlineXMark class="w-5 h-5" />
            </button>
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
            <Show when={!state.selectedTaskDetail?.bittorrent}>
              <button
                class={`tab ${activeTab() === "servers" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("servers")}
              >
                Servers
              </button>
            </Show>
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
                        <div class="font-bold flex-1">{file.path.split("/").pop()}</div>
                        <Show when={!state.selectedTaskDetail?.bittorrent}>
                          <button
                            class="btn btn-ghost btn-xs text-primary font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUrisToDelete(new Set<string>());
                              setNewUrisInput("");
                              setManageUrisFileIndex(index);
                            }}
                          >
                            Manage Links
                          </button>
                        </Show>
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

          <Show when={activeTab() === "servers"}>
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body p-4">
                <h4 class="text-sm font-bold mb-4">
                  Active Connections ({servers().reduce((acc, curr) => acc + (curr.servers?.length || 0), 0)})
                </h4>
                <div class="space-y-4">
                  <Show
                    when={servers().length > 0}
                    fallback={
                      <div class="text-center py-8 opacity-55 text-xs">
                        No active server connections.
                      </div>
                    }
                  >
                    <For each={servers()}>
                      {(serverGroup) => (
                        <div class="space-y-2">
                          <div class="text-[10px] font-bold opacity-60">File Index: {serverGroup.index}</div>
                          <For each={serverGroup.servers}>
                            {(srv) => (
                              <div class="p-3 bg-base-200 rounded-lg text-xs space-y-1">
                                <div class="font-medium break-all font-mono text-[10px] text-primary">
                                  {srv.uri}
                                </div>
                                <div class="flex items-center justify-between text-[10px] pt-1">
                                  <span>Speed: <strong class="text-success">{formatSpeed(Number(srv.downloadSpeed))}</strong></span>
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
                  </Show>
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

      <Show when={manageUrisFileIndex() !== null}>
        <Portal>
          <div class="modal modal-open z-50">
            <div class="modal-box w-11/12 max-w-lg space-y-4">
              <h3 class="font-bold text-lg">Manage Links / Mirrors</h3>
              
              <div class="text-xs opacity-75 break-all font-semibold">
                File: {state.selectedTaskDetail?.files?.[manageUrisFileIndex()!]?.path?.split("/").pop()}
              </div>

              {/* Current URIs list */}
              <div class="space-y-2">
                <div class="text-xs font-bold opacity-60">Current Connections & Mirrors:</div>
                <div class="max-h-48 overflow-y-auto space-y-2 border border-base-300 p-2 rounded-lg bg-base-200">
                  <For each={state.selectedTaskDetail?.files?.[manageUrisFileIndex()!]?.uris}>
                    {(u) => (
                      <div class="flex items-center justify-between gap-2 p-2 bg-base-100 rounded border border-base-200 text-xs">
                        <span 
                          class={`break-all flex-1 select-all font-mono text-[10px] ${
                            urisToDelete().has(u.uri) ? "line-through text-error opacity-60" : ""
                          }`}
                        >
                          {u.uri}
                        </span>
                        <div class="flex items-center gap-2">
                          <span class={`badge badge-xs ${u.status === "used" ? "badge-success text-success-content" : "badge-ghost"}`}>
                            {u.status}
                          </span>
                          <button
                            type="button"
                            class={`btn btn-xs ${
                              urisToDelete().has(u.uri) ? "btn-warning" : "btn-error"
                            }`}
                            onClick={() => handleToggleUriDelete(u.uri)}
                          >
                            {urisToDelete().has(u.uri) ? "Undo" : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              {/* Add mirror URLS */}
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-bold text-xs opacity-60">Add New Mirror URLs (One per line):</span>
                </label>
                <textarea
                  class="textarea textarea-bordered h-24 font-mono text-xs placeholder:opacity-50"
                  placeholder="http://example.com/file.zip&#10;https://another.mirror/file.zip"
                  value={newUrisInput()}
                  onInput={(e) => setNewUrisInput(e.currentTarget.value)}
                />
              </div>

              <div class="modal-action">
                <button
                  class="btn btn-sm btn-ghost"
                  onClick={() => setManageUrisFileIndex(null)}
                >
                  Cancel
                </button>
                <button
                  class="btn btn-sm btn-primary"
                  onClick={handleSaveUris}
                  disabled={urisToDelete().size === 0 && !newUrisInput().trim()}
                >
                  Save Changes
                </button>
              </div>
            </div>
            <div
              class="modal-backdrop bg-black/40"
              onClick={() => setManageUrisFileIndex(null)}
            ></div>
          </div>
        </Portal>
      </Show>
    </Show>
  );
};

export default TaskDetail;
