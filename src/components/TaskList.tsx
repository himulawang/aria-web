import { For, createSignal, type Component, Show, createEffect } from "solid-js";
import { Portal } from "solid-js/web";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { formatSpeed } from "../utils/format";
import AddTask from "./AddTask"; // Import AddTask to reuse its form logic
import {
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronDoubleUp,
  HiOutlineChevronDoubleDown,
  HiOutlineForward,
  HiOutlineXMark,
} from "solid-icons/hi";

const TaskList: Component = () => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "badge-primary";
      case "paused":
        return "badge-warning";
      case "complete":
        return "badge-success";
      case "error":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  const state = aria2Store.getState();
  const [selectedTasks, setSelectedTasks] = createSignal<Set<string>>(
    new Set(),
  );
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [sortKey, setSortKey] = createSignal<string | null>(null);
  const [sortDirection, setSortDirection] = createSignal<"asc" | "desc">("asc");
  const [filter, setFilter] = createSignal<
    "all" | "active" | "waiting" | "stopped"
  >("active");
  const [pendingGid, setPendingGid] = createSignal<string | null>(null);
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

  const [deleteConfirmTasks, setDeleteConfirmTasks] = createSignal<string[] | null>(null);
  const [forceDeleteChecked, setForceDeleteChecked] = createSignal(false);

  const handleConfirmDelete = async () => {
    const gids = deleteConfirmTasks();
    if (gids) {
      for (const gid of gids) {
        if (forceDeleteChecked()) {
          await aria2Store.forceRemoveTask(gid);
        } else {
          await aria2Store.removeTask(gid);
        }
      }
      setSelectedTasks((prev) => {
        const next = new Set(prev);
        gids.forEach((gid) => next.delete(gid));
        return next;
      });
    }
    setDeleteConfirmTasks(null);
  };

  const handleMove = async (
    gid: string,
    pos: number,
    how: "POS_SET" | "POS_CUR" | "POS_END",
  ) => {
    setPendingGid(gid);
    try {
      await aria2Store.changePosition(gid, pos, how);
    } catch (err) {
      console.error("Failed to change task position:", err);
    } finally {
      setPendingGid(null);
    }
  };

  const toggleTask = (gid: string) => {
    const next = new Set(selectedTasks());
    if (next.has(gid)) next.delete(gid);
    else next.add(gid);
    setSelectedTasks(next);
  };

  const toggleAll = () => {
    if (selectedTasks().size === filteredTasks().length) {
      setSelectedTasks(new Set<string>());
    } else {
      setSelectedTasks(new Set(filteredTasks().map((t) => t.gid)));
    }
  };

  const toggleSort = (key: string) => {
    if (sortKey() === key) {
      setSortDirection(sortDirection() === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const hasActiveTasks = () =>
    Array.from(selectedTasks()).some(
      (gid) =>
        state.tasks.find((t) => t.gid === gid)?.status === "active" ||
        state.tasks.find((t) => t.gid === gid)?.status === "waiting",
    );

  const hasNonCompletedTasks = () =>
    Array.from(selectedTasks()).some(
      (gid) =>
        state.tasks.find((t) => t.gid === gid)?.status !== "complete" &&
        state.tasks.find((t) => t.gid === gid)?.status !== "error",
    );

  
  const filteredTasks = () => {
    const tasks = state.tasks;
    let result = tasks;

    if (filter() === "active") {
      result = tasks.filter((t) => t.status === "active");
    } else if (filter() === "waiting") {
      result = tasks.filter((t) => t.status === "paused");
    } else if (filter() === "stopped") {
      result = tasks.filter((t) => t.status === "complete" || t.status === "error");
    } else if (filter() === "all") {
      result = tasks;
    }

    const query = searchQuery().toLowerCase();
    if (query) {
      result = result.filter((t) => {
        const name = t.files[0]?.path?.split("/").pop() || "";
        return name.toLowerCase().includes(query);
      });
    }

    // Sorting Logic
    const key = sortKey();
    const dir = sortDirection();
    if (key) {
      result = [...result].sort((a, b) => {
        let valA: any, valB: any;
        switch (key) {
          case "name":
            valA = a.files[0]?.path?.split("/").pop() || "";
            valB = b.files[0]?.path?.split("/").pop() || "";
            break;
          case "size":
            valA = a.totalLength || 0;
            valB = b.totalLength || 0;
            break;
          case "progress":
            valA = a.totalLength > 0 ? (a.completedLength / a.totalLength) : 0;
            valB = b.totalLength > 0 ? (b.completedLength / b.totalLength) : 0;
            break;
          case "speed":
            valA = Number(a.downloadSpeed) || 0;
            valB = Number(b.downloadSpeed) || 0;
            break;
          case "remain":
            valA = Number(a.remainingTime) || Infinity;
            valB = Number(b.remainingTime) || Infinity;
            break;
          default:
            return 0;
        }
        if (valA < valB) return dir === "asc" ? -1 : 1;
        if (valA > valB) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  };

  return (
    <div class="space-y-4">
      <Show when={isModalOpen()}>
        <Portal>
          <div class="modal modal-open">
            <div class="modal-box w-11/12 max-w-2xl">
              <h3 class="font-bold text-lg mb-4">{t("nav.new")()}</h3>
              <AddTask onClose={() => setIsModalOpen(false)} />
            </div>
            <div
              class="modal-backdrop"
              onClick={() => setIsModalOpen(false)}
            ></div>
          </div>
        </Portal>
      </Show>

      <Show when={deleteConfirmTasks() !== null}>
        <Portal>
          <div class="modal modal-open z-50">
            <div class="modal-box w-11/12 max-w-md">
              <h3 class="font-bold text-lg text-error mb-4">Confirm Delete</h3>
              <p class="text-sm opacity-90">
                Are you sure you want to delete {deleteConfirmTasks()?.length} selected task(s)?
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
                  onClick={() => setDeleteConfirmTasks(null)}
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
              onClick={() => setDeleteConfirmTasks(null)}
            ></div>
          </div>
        </Portal>
      </Show>

      
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <h3 class="text-xl font-bold">{t("task-list.title")()}</h3>
          <input
            type="text"
            placeholder={t("task-list.search")()}
            class="input input-sm input-bordered max-w-xs"
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </div>
        <div class="flex items-center gap-1">
          <Show
            when={selectedTasks().size > 0}
            fallback={
              <>
                <button
                  onClick={() => setIsModalOpen(true)}
                  class="btn btn-sm btn-ghost btn-square"
                  title={t("common.add")()}
                >
                  <HiOutlinePlus class="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    await aria2Store.resumeAll();
                  }}
                  class="btn btn-sm btn-ghost btn-square text-success"
                  title="Resume All Tasks"
                >
                  <HiOutlineForward class="w-5 h-5" />
                </button>
                
                {/* Global Pause Dropdown */}
                <div class="dropdown dropdown-end">
                  <div
                    tabindex="0"
                    role="button"
                    class="btn btn-sm btn-ghost btn-square text-warning"
                    title="Pause All Options"
                  >
                    <HiOutlinePause class="w-5 h-5" />
                  </div>
                  <ul
                    tabindex="0"
                    class="dropdown-content menu bg-base-100 rounded-box z-50 w-40 p-2 shadow-lg border border-base-200"
                  >
                    <li>
                      <button
                        onClick={async () => {
                          await aria2Store.pauseAll();
                        }}
                        class="text-xs text-left"
                      >
                        Pause All
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={async () => {
                          await aria2Store.forcePauseAll();
                        }}
                        class="text-xs text-left text-error font-medium"
                      >
                        Force Pause All
                      </button>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={async () => {
                    await aria2Store.purgeDownloadResult();
                  }}
                  class="btn btn-sm btn-ghost btn-square text-error/80"
                  title="Purge Completed/Stopped Tasks"
                >
                  <HiOutlineTrash class="w-5 h-5" />
                </button>
              </>
            }
          >
            <span class="text-xs font-semibold px-2 py-1 bg-base-300 rounded-lg flex items-center gap-1 mr-1">
              {selectedTasks().size} Selected
              <button
                onClick={() => setSelectedTasks(new Set<string>())}
                class="btn btn-xs btn-ghost btn-circle text-opacity-50 hover:text-opacity-100 p-0 h-4 w-4 min-h-0"
                title="Clear Selection"
              >
                <HiOutlineXMark class="w-3 h-3" />
              </button>
            </span>
            <button
              onClick={async () => {
                for (const gid of selectedTasks()) {
                  if (isShiftPressed()) {
                    await aria2Store.forcePauseTask(gid);
                  } else {
                    await aria2Store.pauseTask(gid);
                  }
                }
                await aria2Store.fetchTasks();
              }}
              class={`btn btn-sm btn-ghost btn-square transition-all ${
                isShiftPressed() ? "text-warning border border-warning/30 bg-warning/5" : ""
              }`}
              title={isShiftPressed() ? "Force Pause Selected (Shift-click)" : t("task-detail.pause")()}
              disabled={!hasActiveTasks()}
            >
              <HiOutlinePause class="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                for (const gid of selectedTasks()) {
                  await aria2Store.resumeTask(gid);
                }
                await aria2Store.fetchTasks();
              }}
              class="btn btn-sm btn-ghost btn-square"
              title={t("task-detail.resume")()}
              disabled={!hasNonCompletedTasks()}
            >
              <HiOutlinePlay class="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                if (isShiftPressed()) {
                  for (const gid of selectedTasks()) {
                    await aria2Store.forceRemoveTask(gid);
                  }
                  setSelectedTasks(new Set<string>());
                  await aria2Store.fetchTasks();
                } else {
                  setForceDeleteChecked(false);
                  setDeleteConfirmTasks(Array.from(selectedTasks()));
                }
              }}
              class={`btn btn-sm btn-ghost btn-square text-error transition-all ${
                isShiftPressed() ? "border border-error/30 bg-error/5 animate-pulse" : ""
              }`}
              title={isShiftPressed() ? "Force Delete Selected (Shift-click)" : t("common.delete")()}
            >
              <HiOutlineTrash class="w-5 h-5" />
            </button>
          </Show>
        </div>
      </div>

      <div class="tabs tabs-boxed gap-1 flex justify-start">
        {[
          { id: "active", label: t("task-list.filter.active") },
          { id: "waiting", label: t("task-list.filter.waiting") },
          { id: "stopped", label: t("task-list.filter.stopped") },
          { id: "all", label: t("task-list.filter.all") },
        ].map((tab) => (
          <button
            onClick={() => setFilter(tab.id as any)}
            class={`tab ${filter() === tab.id ? "tab-active" : ""}`}
          >
            {tab.label()}
          </button>
        ))}
      </div>

      <div class="overflow-x-auto bg-base-100 rounded-box border border-base-300">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  onClick={toggleAll}
                />
              </th>
              <th class="cursor-pointer hover:text-primary" onClick={() => toggleSort("name")}>{t("task-list.title")()} {sortKey() === "name" && (sortDirection() === "asc" ? "↑" : "↓")}</th>
              <th class="cursor-pointer hover:text-primary" onClick={() => toggleSort("progress")}>{t("task-detail.progress")()} {sortKey() === "progress" && (sortDirection() === "asc" ? "↑" : "↓")}</th>
              <th class="text-right cursor-pointer hover:text-primary" onClick={() => toggleSort("status")}>{t("nav.status")()} {sortKey() === "status" && (sortDirection() === "asc" ? "↑" : "↓")}</th>
            </tr>
          </thead>
          <tbody>
            <For each={filteredTasks()}>
              {(task) => (
                <tr
                  onClick={() => {
                    if (state.selectedTaskId !== task.gid) {
                      aria2Store.setSelectedTask(task.gid);
                    }
                  }}
                  class={`hover cursor-pointer transition-all duration-300 ${
                    state.selectedTaskId === task.gid ? "bg-base-200" : ""
                  } ${pendingGid() === task.gid ? "opacity-50 animate-pulse bg-primary/10" : ""}`}
                  style="min-height: 32px;"
                >
                  <td class="p-2">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={selectedTasks().has(task.gid)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task.gid);
                      }}
                    />
                  </td>
                  <td class="p-2">
                    <div class="flex flex-col">
                      <span class="truncate max-w-sm block text-sm font-medium">
                        {task.files[0]?.path?.split("/").pop() ||
                          t("task-status.unknown")()}
                      </span>
                    </div>
                  </td>
                  <td class="p-2">
                    <div class="flex items-center gap-2">
                      <progress
                        class="progress progress-primary w-24 h-2"
                        value={
                          task.totalLength > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (task.completedLength / task.totalLength) *
                                    100,
                                ),
                              )
                            : 0
                        }
                        max="100"
                      ></progress>
                      <span class="text-xs">
                        {task.totalLength > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (task.completedLength / task.totalLength) * 100,
                              ),
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  </td>
                  <td class="p-2 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <Show when={task.status === "paused" || task.status === "waiting"}>
                        <div class="flex items-center gap-0.5 mr-2">
                          <button
                            title="Move to Top"
                            class="btn btn-xs btn-ghost btn-square"
                            disabled={pendingGid() !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(task.gid, 0, "POS_SET");
                            }}
                          >
                            <HiOutlineChevronDoubleUp class="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Move Up"
                            class="btn btn-xs btn-ghost btn-square"
                            disabled={pendingGid() !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(task.gid, -1, "POS_CUR");
                            }}
                          >
                            <HiOutlineChevronUp class="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Move Down"
                            class="btn btn-xs btn-ghost btn-square"
                            disabled={pendingGid() !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(task.gid, 1, "POS_CUR");
                            }}
                          >
                            <HiOutlineChevronDown class="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Move to Bottom"
                            class="btn btn-xs btn-ghost btn-square"
                            disabled={pendingGid() !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(task.gid, 0, "POS_END");
                            }}
                          >
                            <HiOutlineChevronDoubleDown class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Show>
                      <Show when={task.status === "active"}>
                        <span class="text-xs opacity-50">
                          {formatSpeed(Number(task.downloadSpeed))}
                        </span>
                      </Show>
                      <span
                        class={`badge badge-sm ${getStatusStyle(task.status)}`}
                      >
                        {t(`task-status.${task.status}`)()}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;
