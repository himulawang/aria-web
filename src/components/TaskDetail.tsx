import {
  type Component,
  Show,
  createSignal,
  createEffect,
  onCleanup,
} from "solid-js";
import { aria2Store } from "../store";
import { notificationStore } from "../store/notification-store";
import { t } from "../i18n";
import {
  HiOutlineXMark,
  HiOutlinePencil,
  HiOutlineCommandLine,
  HiOutlineTrash,
} from "solid-icons/hi";

// Import modular sub-components
import { TaskOverview } from "./task-detail/TaskOverview";
import { TaskPeers } from "./task-detail/TaskPeers";
import { TaskFiles } from "./task-detail/TaskFiles";
import { TaskServers } from "./task-detail/TaskServers";
import { TaskDetailEdit } from "./task-detail/TaskDetailEdit";
import { TaskDetailExport } from "./task-detail/TaskDetailExport";
import { TaskDetailLinks } from "./task-detail/TaskDetailLinks";

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

  // Link Management File Index
  const [manageUrisFileIndex, setManageUrisFileIndex] = createSignal<number | null>(null);

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
              <TaskOverview task={state.selectedTaskDetail} />
            </Show>

            {/* TAB PEERS */}
            <Show when={activeTab() === "peers"}>
              <TaskPeers peers={peers()} numPieces={state.selectedTaskDetail?.numPieces} />
            </Show>

            {/* TAB FILES */}
            <Show when={activeTab() === "files"}>
              <TaskFiles 
                files={state.selectedTaskDetail?.files}
                isBittorrent={state.selectedTaskDetail?.bittorrent}
                selectedIndices={selectedIndices()}
                onToggleSelection={toggleFileSelection}
                onManageLinks={(index) => {
                  setManageUrisFileIndex(index);
                  setCurrentMode("links");
                }}
              />
            </Show>

            {/* TAB SERVERS */}
            <Show when={activeTab() === "servers"}>
              <TaskServers servers={servers()} />
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
            <TaskDetailEdit 
              task={state.selectedTaskDetail}
              onCancel={() => setCurrentMode("detail")}
              onSaveSuccess={() => setCurrentMode("detail")}
            />
          </Show>

          {/* RENDER MODE: INLINE EXPORT */}
          <Show when={currentMode() === "export"}>
            <TaskDetailExport 
              task={state.selectedTaskDetail}
              onCancel={() => setCurrentMode("detail")}
            />
          </Show>

          {/* RENDER MODE: INLINE MIRROR LINK MANAGEMENT */}
          <Show when={currentMode() === "links" && manageUrisFileIndex() !== null}>
            <TaskDetailLinks 
              task={state.selectedTaskDetail}
              fileIndex={manageUrisFileIndex()!}
              onCancel={() => {
                setCurrentMode("detail");
                setManageUrisFileIndex(null);
              }}
              onSaveSuccess={() => {
                setCurrentMode("detail");
                setManageUrisFileIndex(null);
              }}
            />
          </Show>

        </div>
      </div>
    </Show>
  );
};

export default TaskDetail;
