import {
  type Component,
  Show,
  createSignal,
  createEffect,
  For,
  onCleanup,
} from "solid-js";
import { aria2Store } from "../store";
import { notificationStore } from "../store/notification-store";
import { t } from "../i18n";
import { formatSize, formatSpeed } from "../utils/format";
import { parsePeerId, calculatePeerProgress } from "../utils/peer";
import {
  HiOutlineXMark,
  HiOutlineArrowLeft,
  HiOutlinePencil,
  HiOutlineCommandLine,
  HiOutlineTrash,
  HiOutlineClipboard,
  HiOutlineCheck,
} from "solid-icons/hi";

const TaskDetail: Component = () => {
  const state = aria2Store.getState();
  const [activeTab, setActiveTab] = createSignal("overview");
  const [peers, setPeers] = createSignal<any[]>([]);
  const [selectedIndices, setSelectedIndices] = createSignal<Set<number>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = createSignal(false);
  const [servers, setServers] = createSignal<any[]>([]);

  // State-machine for routing views inline
  const [currentMode, setCurrentMode] = createSignal<"detail" | "edit" | "export" | "links">("detail");

  // Inline Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [forceDeleteChecked, setForceDeleteChecked] = createSignal(false);

  // Inline Edit Options States
  const [editDir, setEditDir] = createSignal("");
  const [editOut, setEditOut] = createSignal("");
  const [editSplit, setEditSplit] = createSignal("1");
  const [isSavingOptions, setIsSavingOptions] = createSignal(false);

  // Inline Link Management States
  const [manageUrisFileIndex, setManageUrisFileIndex] = createSignal<number | null>(null);
  const [newUrisInput, setNewUrisInput] = createSignal("");
  const [urisToDelete, setUrisToDelete] = createSignal<Set<string>>(new Set());
  const [isSavingUris, setIsSavingUris] = createSignal(false);

  // Inline Export States
  const [exportType, setExportType] = createSignal<"cli" | "rpc">("cli");
  const [exportCommand, setExportCommand] = createSignal("");

  // Sync Shift Key
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

  // Reset and Sync states on task selection change
  createEffect(() => {
    const task = state.selectedTaskDetail;
    if (!task) {
      setCurrentMode("detail");
      setShowDeleteConfirm(false);
      setManageUrisFileIndex(null);
    }
  });

  // Fetch active options when entering "edit" mode
  createEffect(async () => {
    const gid = state.selectedTaskDetail?.gid;
    if (currentMode() === "edit" && gid) {
      try {
        const [dirVal, outVal, splitVal] = await Promise.allSettled([
          aria2Store.getTaskOption(gid, "dir"),
          aria2Store.getTaskOption(gid, "out"),
          aria2Store.getTaskOption(gid, "split")
        ]);

        setEditDir(dirVal.status === "fulfilled" ? String(dirVal.value) : (state.selectedTaskDetail?.dir || ""));
        setEditOut(outVal.status === "fulfilled" ? String(outVal.value) : (state.selectedTaskDetail?.out || ""));
        setEditSplit(splitVal.status === "fulfilled" ? String(splitVal.value) : (state.selectedTaskDetail?.split || "1"));
      } catch (e) {
        console.error("Failed to load options from server", e);
        setEditDir(state.selectedTaskDetail?.dir || "");
        setEditOut(state.selectedTaskDetail?.out || "");
        setEditSplit(state.selectedTaskDetail?.split || "1");
      }
    }
  });

  // Fetch servers when tab changes to 'servers'
  createEffect(() => {
    let timer: any = null;
    const gid = state.selectedTaskDetail?.gid;

    if (currentMode() === "detail" && activeTab() === "servers" && gid && !state.selectedTaskDetail?.bittorrent) {
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
    if (currentMode() === "detail" && activeTab() === "peers" && state.selectedTaskDetail?.gid) {
      setPeers([]);
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
    if (currentMode() === "detail" && activeTab() === "files" && gid) {
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

  // Get first URL for Export
  const getFirstUrl = () => {
    if (state.selectedTaskDetail?.urls?.[0]) return state.selectedTaskDetail.urls[0];
    return state.selectedTaskDetail?.files?.[0]?.uris?.[0]?.uri || "";
  };

  // Generate CLI / RPC commands dynamically
  createEffect(() => {
    const task = state.selectedTaskDetail;
    if (!task || currentMode() !== "export") return;

    const url = getFirstUrl();
    if (exportType() === "cli") {
      let cmd = `aria2c "${url}"`;
      if (task.dir) cmd += ` --dir="${task.dir}"`;
      if (task.out) cmd += ` --out="${task.out}"`;
      if (task.split) cmd += ` --split=${task.split}`;
      setExportCommand(cmd);
    } else {
      const rpc = {
        method: "aria2.addUri",
        params: [
          "token:your_token",
          [[url]],
          {
            dir: task.dir,
            out: task.out,
            split: task.split,
          }
        ]
      };
      setExportCommand(JSON.stringify(rpc, null, 2));
    }
  });

  // Clipboard copy helper
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportCommand());
      notificationStore.add("Command copied to clipboard", "success");
    } catch (err) {
      notificationStore.add("Failed to copy command", "error");
      console.error("Failed to copy:", err);
    }
  };

  // Save options inline
  const handleSaveOptions = async () => {
    const gid = state.selectedTaskDetail?.gid;
    if (!gid) return;

    setIsSavingOptions(true);
    const options = {
      dir: editDir().trim(),
      out: editOut().trim(),
      split: editSplit().trim(),
    };

    const filteredOptions: Record<string, any> = {};
    for (const [key, value] of Object.entries(options)) {
      if (value !== "") {
        filteredOptions[key] = value;
      }
    }

    try {
      await aria2Store.changeTaskOption(gid, filteredOptions);
      notificationStore.add("Task options saved successfully", "success");
      await aria2Store.fetchTaskDetail(gid);
      setCurrentMode("detail");
    } catch (err) {
      notificationStore.add(`Failed to save task options: ${err}`, "error");
    } finally {
      setIsSavingOptions(false);
    }
  };

  // Toggle link deletion state
  const handleToggleUriDelete = (uri: string) => {
    const next = new Set<string>(urisToDelete());
    if (next.has(uri)) {
      next.delete(uri);
    } else {
      next.add(uri);
    }
    setUrisToDelete(next);
  };

  // Save links inline
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

    setIsSavingUris(true);
    try {
      await aria2Store.changeUri(gid, fileIdx + 1, delUris, addUris);
      notificationStore.add("URIs updated successfully", "success");
      await aria2Store.fetchTaskDetail(gid);
      setManageUrisFileIndex(null);
      setCurrentMode("detail");
    } catch (err) {
      notificationStore.add(`Failed to update URIs: ${err}`, "error");
    } finally {
      setIsSavingUris(false);
      setNewUrisInput("");
      setUrisToDelete(new Set<string>());
    }
  };

  const handleConfirmDelete = async () => {
    const gid = state.selectedTaskDetail!.gid;
    try {
      if (forceDeleteChecked()) {
        await aria2Store.forceRemoveTask(gid);
      } else {
        await aria2Store.removeTask(gid);
      }
      aria2Store.setSelectedTask(null);
      setShowDeleteConfirm(false);
      notificationStore.add("Task deleted successfully", "success");
    } catch (err) {
      notificationStore.add(`Failed to delete task: ${err}`, "error");
    }
  };

  let detailRef: HTMLDivElement | undefined;

  // Click outside to close (excluding modals and notifications)
  createEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        detailRef &&
        !detailRef.contains(target) &&
        !target.closest(".modal") &&
        !target.closest(".toast") &&
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
        class="fixed top-20 right-4 w-[26rem] max-h-[calc(100vh-6rem)] overflow-y-auto card bg-base-100/95 backdrop-blur-md shadow-2xl border border-base-300 p-6 z-40 transition-all duration-300 ease-out animate-in slide-in-from-right-10 duration-200"
      >
        <div class="space-y-5">
          
          {/* RENDER MODE: DETAIL VIEW */}
          <Show when={currentMode() === "detail"}>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <h2 class="text-lg font-bold">{t("task-detail.title")()}</h2>
                <div
                  class={`badge badge-sm font-semibold py-2.5 ${
                    state.selectedTaskDetail?.status === "active"
                      ? "badge-primary text-primary-content"
                      : "badge-ghost border border-base-300 opacity-80"
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

            <div class="tabs tabs-boxed bg-base-200/50 p-1 gap-1">
              <button
                class={`tab tab-sm flex-1 font-semibold ${activeTab() === "overview" ? "tab-active bg-base-100 shadow-sm" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                {t("task-detail.tabs.overview")()}
              </button>
              <button
                class={`tab tab-sm flex-1 font-semibold ${activeTab() === "peers" ? "tab-active bg-base-100 shadow-sm" : ""}`}
                onClick={() => setActiveTab("peers")}
              >
                {t("task-detail.tabs.peers")()}
              </button>
              <button
                class={`tab tab-sm flex-1 font-semibold ${activeTab() === "files" ? "tab-active bg-base-100 shadow-sm" : ""}`}
                onClick={() => setActiveTab("files")}
              >
                {t("task-detail.tabs.files")()}
              </button>
              <Show when={!state.selectedTaskDetail?.bittorrent}>
                <button
                  class={`tab tab-sm flex-1 font-semibold ${activeTab() === "servers" ? "tab-active bg-base-100 shadow-sm" : ""}`}
                  onClick={() => setActiveTab("servers")}
                >
                  Servers
                </button>
              </Show>
            </div>

            {/* TAB OVERVIEW */}
            <Show when={activeTab() === "overview"}>
              <div class="card bg-base-200/30 border border-base-300/60 rounded-xl overflow-hidden">
                <div class="p-0">
                  <table class="table w-full text-xs">
                    <tbody>
                      <tr class="hover:bg-base-200/10 border-b border-base-200/50">
                        <th class="text-xs opacity-60 w-1/3 py-3 px-4 font-semibold align-top">
                          {t("task-detail.fileName")()}
                        </th>
                        <td class="break-all whitespace-normal py-3 px-4 font-medium pr-6 leading-relaxed">
                          {state.selectedTaskDetail?.files?.[0]?.path
                            ?.split("/")
                            .pop() || t("task-status.unknown")()}
                        </td>
                      </tr>
                      <tr class="hover:bg-base-200/10 border-b border-base-200/50">
                        <th class="text-xs opacity-60 w-1/3 py-3 px-4 font-semibold align-top">
                          {t("task-detail.directory")()}
                        </th>
                        <td class="break-all whitespace-normal py-3 px-4 opacity-80 leading-relaxed">
                          {state.selectedTaskDetail?.dir}
                        </td>
                      </tr>
                      <tr class="hover:bg-base-200/10 border-b border-base-200/50">
                        <th class="text-xs opacity-60 py-3 px-4 font-semibold">
                          {t("task-detail.progress")()}
                        </th>
                        <td class="py-3 px-4">
                          <div class="flex items-center gap-3">
                            <progress
                              class="progress progress-primary w-full h-2"
                              value={state.selectedTaskDetail!.completedLength}
                              max={state.selectedTaskDetail!.totalLength || 1}
                            ></progress>
                            <span class="font-bold whitespace-nowrap">
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
                      <tr class="hover:bg-base-200/10 border-b border-base-200/50">
                        <th class="text-xs opacity-60 py-3 px-4 font-semibold">
                          {t("task-detail.totalSize")()}
                        </th>
                        <td class="py-3 px-4 font-medium">
                          {formatSize(Number(state.selectedTaskDetail!.totalLength))}
                        </td>
                      </tr>
                      <Show when={state.selectedTaskDetail?.status === "active"}>
                        <tr class="hover:bg-base-200/10 border-b border-base-200/50">
                          <th class="text-xs opacity-60 py-3 px-4 font-semibold">
                            Speed
                          </th>
                          <td class="py-3 px-4 font-semibold text-success flex items-center gap-2">
                            <span>DL: {formatSpeed(Number(state.selectedTaskDetail.downloadSpeed))}</span>
                            <Show when={state.selectedTaskDetail.bittorrent}>
                              <span class="text-info font-medium">UL: {formatSpeed(Number(state.selectedTaskDetail.uploadSpeed))}</span>
                            </Show>
                          </td>
                        </tr>
                      </Show>
                      <tr class="hover:bg-base-200/10 border-none">
                        <th class="text-xs opacity-60 py-3 px-4 font-semibold">
                          GID
                        </th>
                        <td class="py-3 px-4 font-mono select-all text-[11px] opacity-75">
                          {state.selectedTaskDetail?.gid}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Show>

            {/* TAB PEERS */}
            <Show when={activeTab() === "peers"}>
              <div class="card bg-base-200/30 border border-base-300/60 rounded-xl overflow-hidden">
                <div class="max-h-72 overflow-y-auto">
                  <table class="table w-full text-xs">
                    <thead class="sticky top-0 bg-base-100 border-b border-base-200 shadow-sm z-10">
                      <tr>
                        <th class="text-[10px] opacity-70 font-bold py-2.5 px-4">IP:Port</th>
                        <th class="text-[10px] opacity-70 font-bold py-2.5 px-4">Client</th>
                        <th class="text-[10px] opacity-70 font-bold py-2.5 px-4 text-right">Speed</th>
                        <th class="text-[10px] opacity-70 font-bold py-2.5 px-4 text-right">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For
                        each={peers()}
                        fallback={
                          <tr>
                            <td colspan="4" class="text-center py-8 opacity-50 text-[11px]">
                              {t("task-detail.peers.empty")()}
                            </td>
                          </tr>
                        }
                      >
                        {(peer) => (
                          <tr class="hover:bg-base-200/20 border-b border-base-200/50">
                            <td class="font-mono text-[10px] py-2.5 px-4 break-all">
                              {peer.ip}:{peer.port}
                            </td>
                            <td class="py-2.5 px-4 max-w-[90px] truncate text-[11px]" title={parsePeerId(peer.peerId)}>
                              {parsePeerId(peer.peerId)}
                            </td>
                            <td class="py-2.5 px-4 text-right text-success font-semibold text-[10px]">
                              {formatSpeed(Number(peer.downloadSpeed))}
                            </td>
                            <td class="py-2.5 px-4 text-right font-medium text-[10px]">
                              {calculatePeerProgress(peer.bitfield, state.selectedTaskDetail?.numPieces)}%
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </div>
            </Show>

            {/* TAB FILES */}
            <Show when={activeTab() === "files"}>
              <div class="space-y-3">
                <span class="text-xs font-semibold opacity-70 block mb-1">
                  Select Files to Download:
                </span>
                <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  <For each={state.selectedTaskDetail?.files}>
                    {(file, index) => (
                      <div 
                        class={`p-3 rounded-xl text-xs space-y-1.5 cursor-pointer border transition-all duration-200 ${
                          selectedIndices().has(index()) 
                            ? 'bg-primary/5 border-primary/30 shadow-sm' 
                            : 'bg-base-200/50 border-base-300/40 hover:bg-base-200'
                        }`}
                        onClick={() => toggleFileSelection(index())}
                      >
                        <div class="flex items-start gap-2.5">
                          <input 
                            type="checkbox" 
                            checked={selectedIndices().has(index())} 
                            onChange={() => {}} 
                            class="checkbox checkbox-primary checkbox-xs mt-0.5"
                          />
                          <div class="font-bold flex-1 break-all text-[11px] leading-tight">
                            {file.path.split("/").pop()}
                          </div>
                          <Show when={!state.selectedTaskDetail?.bittorrent}>
                            <button
                              class="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10 px-2 min-h-0 h-6 gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUrisToDelete(new Set<string>());
                                setNewUrisInput("");
                                setManageUrisFileIndex(index());
                                setCurrentMode("links");
                              }}
                            >
                              <HiOutlineCommandLine class="w-3.5 h-3.5" />
                              Links
                            </button>
                          </Show>
                        </div>
                        <div class="text-[10px] opacity-60 pl-6 flex justify-between font-mono">
                          <span>Size: {formatSize(Number(file.length))}</span>
                          <span>Progress: {Math.round(Number(file.completedLength) / (Number(file.length) || 1) * 100)}%</span>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* TAB SERVERS */}
            <Show when={activeTab() === "servers"}>
              <div class="space-y-3">
                <span class="text-xs font-semibold opacity-70 block mb-1">
                  Active Connections ({servers().reduce((acc, curr) => acc + (curr.servers?.length || 0), 0)})
                </span>
                <div class="space-y-3 max-h-72 overflow-y-auto pr-1">
                  <For
                    each={servers()}
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
            </Show>

            {/* BOTTOM ACTION BUTTONS */}
            <Show
              when={showDeleteConfirm()}
              fallback={
                <div class="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setCurrentMode("edit");
                    }}
                    class="btn btn-sm btn-outline btn-primary flex-1 gap-1 px-1 text-xs"
                  >
                    <HiOutlinePencil class="w-3.5 h-3.5" />
                    {t("task-detail.edit")()}
                  </button>
                  <button
                    onClick={() => {
                      setCurrentMode("export");
                    }}
                    class="btn btn-sm btn-outline flex-1 gap-1 px-1 text-xs"
                  >
                    <HiOutlineCommandLine class="w-3.5 h-3.5" />
                    <span class="truncate">{t("task-detail.show-api")()}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (isShiftPressed()) {
                        handleConfirmDelete();
                      } else {
                        setForceDeleteChecked(false);
                        setShowDeleteConfirm(true);
                      }
                    }}
                    class={`btn btn-sm btn-outline btn-error flex-1 gap-1 px-1 text-xs transition-all ${
                      isShiftPressed() ? "bg-error text-error-content" : ""
                    }`}
                    title={isShiftPressed() ? "Force Delete Task (Shift-click)" : "Delete Task"}
                  >
                    <HiOutlineTrash class="w-3.5 h-3.5" />
                    <span class="truncate">{isShiftPressed() ? "Force Delete" : t("common.delete")()}</span>
                  </button>
                </div>
              }
            >
              {/* INLINE DELETE CONFIRMATION CARD */}
              <div class="p-4 bg-error/10 border border-error/25 rounded-xl space-y-3 mt-2 animate-in fade-in zoom-in-95 duration-200">
                <div class="text-xs font-bold text-error flex items-center gap-1.5">
                  <HiOutlineTrash class="w-4 h-4" />
                  Confirm Delete
                </div>
                <p class="text-[11px] opacity-90 leading-relaxed">
                  Are you sure you want to delete this task? This action cannot be undone.
                </p>
                
                <label class="label cursor-pointer justify-start gap-2.5 p-0">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-error checkbox-xs"
                    checked={forceDeleteChecked()}
                    onChange={(e) => setForceDeleteChecked(e.currentTarget.checked)}
                  />
                  <span class="label-text text-[11px] font-medium opacity-80 select-none">Force delete immediately (skip tracker handshake)</span>
                </label>

                <div class="flex justify-end gap-2 pt-1">
                  <button
                    class="btn btn-xs btn-ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    class="btn btn-xs btn-error font-semibold"
                    onClick={handleConfirmDelete}
                  >
                    Delete Task
                  </button>
                </div>
              </div>
            </Show>
          </Show>

          {/* RENDER MODE: INLINE OPTION EDIT */}
          <Show when={currentMode() === "edit"}>
            <div class="flex items-center gap-3">
              <button 
                onClick={() => setCurrentMode("detail")} 
                class="btn btn-sm btn-ghost btn-circle"
                disabled={isSavingOptions()}
              >
                <HiOutlineArrowLeft class="w-5 h-5" />
              </button>
              <h2 class="text-lg font-bold">{t("task-detail.edit")()}</h2>
            </div>

            <div class="space-y-4 py-1">
              <div class="form-control w-full">
                <label class="label pt-0">
                  <span class="label-text font-semibold text-xs opacity-75">{t("task-detail.directory")()}</span>
                </label>
                <input
                  type="text"
                  class="input input-sm input-bordered w-full font-mono text-xs"
                  value={editDir()}
                  onInput={(e) => setEditDir(e.currentTarget.value)}
                  disabled={isSavingOptions()}
                />
              </div>

              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-semibold text-xs opacity-75">{t("task-detail.out")()}</span>
                </label>
                <input
                  type="text"
                  class="input input-sm input-bordered w-full font-mono text-xs"
                  value={editOut()}
                  onInput={(e) => setEditOut(e.currentTarget.value)}
                  disabled={isSavingOptions()}
                />
              </div>

              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-semibold text-xs opacity-75">{t("task-detail.split")()}</span>
                </label>
                <input
                  type="number"
                  class="input input-sm input-bordered w-full font-mono text-xs"
                  value={editSplit()}
                  onInput={(e) => setEditSplit(e.currentTarget.value)}
                  disabled={isSavingOptions()}
                />
              </div>

              <div class="flex gap-2 pt-4">
                <button
                  class="btn btn-sm btn-ghost flex-1"
                  onClick={() => setCurrentMode("detail")}
                  disabled={isSavingOptions()}
                >
                  Cancel
                </button>
                <button
                  class="btn btn-sm btn-primary flex-1 gap-1.5"
                  onClick={handleSaveOptions}
                  disabled={isSavingOptions()}
                >
                  <Show when={isSavingOptions()} fallback={<HiOutlineCheck class="w-4 h-4" />}>
                    <span class="loading loading-spinner loading-xs"></span>
                  </Show>
                  Save Options
                </button>
              </div>
            </div>
          </Show>

          {/* RENDER MODE: INLINE EXPORT */}
          <Show when={currentMode() === "export"}>
            <div class="flex items-center gap-3">
              <button 
                onClick={() => setCurrentMode("detail")} 
                class="btn btn-sm btn-ghost btn-circle"
              >
                <HiOutlineArrowLeft class="w-5 h-5" />
              </button>
              <h2 class="text-lg font-bold">{t("task-detail.show-api")()}</h2>
            </div>

            <div class="space-y-4 py-1">
              <div class="tabs tabs-boxed bg-base-200/50 p-1 gap-1">
                <button
                  class={`tab tab-sm flex-1 font-semibold ${exportType() === "cli" ? "tab-active bg-base-100 shadow-sm" : ""}`}
                  onClick={() => setExportType("cli")}
                >
                  aria2c CLI
                </button>
                <button
                  class={`tab tab-sm flex-1 font-semibold ${exportType() === "rpc" ? "tab-active bg-base-100 shadow-sm" : ""}`}
                  onClick={() => setExportType("rpc")}
                >
                  JSON-RPC
                </button>
              </div>

              <div class="relative">
                <textarea
                  class="textarea textarea-bordered w-full h-56 font-mono text-[10px] leading-relaxed p-3 bg-base-200/60"
                  value={exportCommand()}
                  readonly
                />
                <button
                  class="btn btn-primary btn-xs absolute bottom-3 right-3 gap-1.5 shadow-md py-1 px-3 min-h-0 h-7"
                  onClick={copyToClipboard}
                >
                  <HiOutlineClipboard class="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>

              <button
                class="btn btn-sm btn-outline btn-block mt-2"
                onClick={() => setCurrentMode("detail")}
              >
                Back to Details
              </button>
            </div>
          </Show>

          {/* RENDER MODE: INLINE MIRROR LINK MANAGEMENT */}
          <Show when={currentMode() === "links" && manageUrisFileIndex() !== null}>
            <div class="flex items-center gap-3">
              <button 
                onClick={() => { setCurrentMode("detail"); setManageUrisFileIndex(null); }} 
                class="btn btn-sm btn-ghost btn-circle"
                disabled={isSavingUris()}
              >
                <HiOutlineArrowLeft class="w-5 h-5" />
              </button>
              <h2 class="text-lg font-bold">Manage Links</h2>
            </div>

            <div class="space-y-4 py-1">
              <div class="p-3 bg-base-200/40 border border-base-300/40 rounded-xl text-xs space-y-1">
                <span class="opacity-60 block font-bold text-[9px]">FILE NAME:</span>
                <span class="break-all font-semibold text-primary leading-tight block">
                  {state.selectedTaskDetail?.files?.[manageUrisFileIndex()!]?.path?.split("/").pop()}
                </span>
              </div>

              <div class="space-y-2">
                <span class="text-xs font-semibold opacity-70 block">Current Mirrors:</span>
                <div class="max-h-48 overflow-y-auto space-y-2 border border-base-300/50 p-2 rounded-xl bg-base-200/30">
                  <For 
                    each={state.selectedTaskDetail?.files?.[manageUrisFileIndex()!]?.uris}
                    fallback={
                      <div class="text-center py-6 opacity-50 text-[10px]">No mirrors available.</div>
                    }
                  >
                    {(u) => (
                      <div class="flex items-center justify-between gap-3 p-2 bg-base-100 rounded-lg border border-base-200 text-xs">
                        <span 
                          class={`break-all flex-1 font-mono text-[9px] select-all leading-relaxed ${
                            urisToDelete().has(u.uri) ? "line-through text-error opacity-60" : ""
                          }`}
                        >
                          {u.uri}
                        </span>
                        <div class="flex items-center gap-2">
                          <span class={`badge badge-xs text-[8px] py-1 font-bold ${u.status === "used" ? "badge-success text-success-content" : "badge-ghost opacity-60"}`}>
                            {u.status}
                          </span>
                          <button
                            type="button"
                            class={`btn btn-[10px] min-h-0 h-6 px-2.5 ${
                              urisToDelete().has(u.uri) ? "btn-warning text-warning-content font-bold" : "btn-error btn-outline hover:bg-error"
                            }`}
                            onClick={() => handleToggleUriDelete(u.uri)}
                            disabled={isSavingUris()}
                          >
                            {urisToDelete().has(u.uri) ? "Undo" : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              <div class="form-control">
                <label class="label pt-0">
                  <span class="label-text font-semibold text-xs opacity-75">Add New Mirror URLs (One per line):</span>
                </label>
                <textarea
                  class="textarea textarea-bordered h-20 font-mono text-xs placeholder:opacity-50"
                  placeholder="http://example.com/file.zip&#10;https://another.mirror/file.zip"
                  value={newUrisInput()}
                  onInput={(e) => setNewUrisInput(e.currentTarget.value)}
                  disabled={isSavingUris()}
                />
              </div>

              <div class="flex gap-2 pt-2">
                <button
                  class="btn btn-sm btn-ghost flex-1"
                  onClick={() => { setCurrentMode("detail"); setManageUrisFileIndex(null); }}
                  disabled={isSavingUris()}
                >
                  Cancel
                </button>
                <button
                  class="btn btn-sm btn-primary flex-1 gap-1.5"
                  onClick={handleSaveUris}
                  disabled={isSavingUris() || (urisToDelete().size === 0 && !newUrisInput().trim())}
                >
                  <Show when={isSavingUris()} fallback={<HiOutlineCheck class="w-4 h-4" />}>
                    <span class="loading loading-spinner loading-xs"></span>
                  </Show>
                  Save Changes
                </button>
              </div>
            </div>
          </Show>

        </div>
      </div>
    </Show>
  );
};

export default TaskDetail;
