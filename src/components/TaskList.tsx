import { createSignal, type Component, Show, createEffect } from "solid-js";
import { Portal } from "solid-js/web";
import { aria2Store } from "../store";
import { t } from "../i18n";
import AddTask from "./AddTask";
import DeleteConfirmModal from "./DeleteConfirmModal";
import TaskListHeader from "./TaskListHeader";
import TaskListTable from "./TaskListTable";
import { useDragSelect } from "./useDragSelect";

interface TaskListProps {
  filter: "all" | "active" | "waiting" | "stopped";
  setFilter: (f: "all" | "active" | "waiting" | "stopped") => void;
}

const TaskList: Component<TaskListProps> = (props) => {
  const state = aria2Store.getState();
  const groupCache = new Map<string, any>();
  const [selectedTasks, setSelectedTasks] = createSignal<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [sortKey, setSortKey] = createSignal<string | null>(null);
  const [sortDirection, setSortDirection] = createSignal<"asc" | "desc">("asc");
  const [isShiftPressed, setIsShiftPressed] = createSignal(false);
  const [collapsedDirs, setCollapsedDirs] = createSignal<Set<string>>((() => {
    try {
      const stored = localStorage.getItem("aria2_collapsed_dirs");
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  })());

  const { isDragging, dragStart, dragEnd, handleMouseDown, setContainerRef } = useDragSelect(
    selectedTasks,
    setSelectedTasks,
  );

  const toggleDirCollapse = (dir: string) => {
    const next = new Set(collapsedDirs());
    if (next.has(dir)) {
      next.delete(dir);
    } else {
      next.add(dir);
    }
    setCollapsedDirs(next);
  };

  // Sync collapsed state with active task directories to prune completed tasks/folders.
  createEffect(() => {
    const tasks = state.tasks;
    const collapsed = collapsedDirs();

    if (state.initialFetchDone) {
      const currentDirs = new Set(tasks.map((t) => t.dir || "Default"));
      const pruned = new Set<string>();
      let changed = false;

      for (const dir of collapsed) {
        if (currentDirs.has(dir)) {
          pruned.add(dir);
        } else {
          changed = true;
        }
      }

      if (changed) {
        setCollapsedDirs(pruned);
        localStorage.setItem("aria2_collapsed_dirs", JSON.stringify(Array.from(pruned)));
      } else {
        localStorage.setItem("aria2_collapsed_dirs", JSON.stringify(Array.from(collapsed)));
      }
    }
  });

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
    if (gids && gids.length > 0) {
      try {
        if (forceDeleteChecked()) {
          await aria2Store.forceRemoveTasks(gids);
        } else {
          await aria2Store.removeTasks(gids);
        }
        setSelectedTasks((prev) => {
          const next = new Set(prev);
          gids.forEach((gid) => next.delete(gid));
          return next;
        });
      } catch (e) {
        console.error("Failed to batch delete tasks:", e);
      }
    }
    setDeleteConfirmTasks(null);
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

  const filteredTasks = () => {
    const tasks = state.tasks;
    let result = tasks;

    if (props.filter === "active") {
      result = tasks.filter((t) => t.status === "active");
    } else if (props.filter === "waiting") {
      result = tasks.filter((t) => t.status === "paused" || t.status === "waiting");
    } else if (props.filter === "stopped") {
      result = tasks.filter((t) => t.status === "complete" || t.status === "error");
    } else if (props.filter === "all") {
      result = tasks;
    }

    const query = searchQuery().trim();
    if (query) {
      let isMatch: (val: string) => boolean;
      if (query.includes("*") || query.includes("?")) {
        const escaped = query.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        const regexStr = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
        try {
          const regex = new RegExp(`^${regexStr}$`, "i");
          isMatch = (val: string) => regex.test(val);
        } catch (err) {
          const lowerQuery = query.toLowerCase();
          isMatch = (val: string) => val.toLowerCase().includes(lowerQuery);
        }
      } else {
        const lowerQuery = query.toLowerCase();
        isMatch = (val: string) => val.toLowerCase().includes(lowerQuery);
      }

      result = result.filter((t) => {
        const name = t.files[0]?.path?.split("/").pop() || "";
        const directory = t.dir || "";
        return isMatch(name) || isMatch(directory);
      });
    }

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

  const groupedTasks = () => {
    const tasks = filteredTasks();
    const map = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const dir = task.dir || "Default";
      if (!map.has(dir)) {
        map.set(dir, []);
      }
      map.get(dir)!.push(task);
    }

    const sortedGroups = Array.from(map.entries()).map(([dir, tasks]) => {
      const totalSize = tasks.reduce((sum, t) => sum + Number(t.totalLength || 0), 0);
      const completedLength = tasks.reduce((sum, t) => sum + Number(t.completedLength || 0), 0);
      const totalSpeed = tasks.reduce((sum, t) => sum + (t.status === "active" ? Number(t.downloadSpeed || 0) : 0), 0);

      const activeCount = tasks.filter(t => t.status === "active" || t.status === "waiting").length;
      const pausedCount = tasks.filter(t => t.status === "paused").length;
      const completedCount = tasks.filter(t => t.status === "complete").length;
      const errorCount = tasks.filter(t => t.status === "error").length;

      let progressPercent = 0;
      if (props.filter === "active") {
        progressPercent = totalSize > 0
          ? Math.min(100, Math.round((completedLength / totalSize) * 100))
          : 0;
      } else {
        progressPercent = tasks.length > 0
          ? Math.min(100, Math.round((completedCount / tasks.length) * 100))
          : 0;
      }

      // Check if there is a cached group with the identical properties and task elements
      const existing = groupCache.get(dir);
      if (
        existing &&
        existing.totalSize === totalSize &&
        existing.completedLength === completedLength &&
        existing.progressPercent === progressPercent &&
        existing.totalSpeed === totalSpeed &&
        existing.activeCount === activeCount &&
        existing.pausedCount === pausedCount &&
        existing.completedCount === completedCount &&
        existing.errorCount === errorCount &&
        existing.tasks.length === tasks.length &&
        existing.tasks.every((t: any, idx: number) => t === tasks[idx])
      ) {
        return existing;
      }

      const newGroup = {
        dir,
        tasks,
        totalSize,
        completedLength,
        progressPercent,
        totalSpeed,
        activeCount,
        pausedCount,
        completedCount,
        errorCount,
      };
      groupCache.set(dir, newGroup);
      return newGroup;
    });

    // Clean up cached directories no longer present
    const currentDirs = new Set(sortedGroups.map((g) => g.dir));
    for (const cachedDir of groupCache.keys()) {
      if (!currentDirs.has(cachedDir)) {
        groupCache.delete(cachedDir);
      }
    }

    sortedGroups.sort((a, b) => a.dir.localeCompare(b.dir));
    return sortedGroups;
  };

  const toggleExpandCollapseAll = () => {
    const allDirs = new Set<string>(state.tasks.map((t) => t.dir || "Default"));
    if (collapsedDirs().size === allDirs.size) {
      setCollapsedDirs(new Set<string>());
    } else {
      setCollapsedDirs(allDirs);
    }
  };

  const arrangePriorityByDirectory = async () => {
    const queueable = state.tasks.filter(
      (t) => t.status === "active" || t.status === "waiting" || t.status === "paused"
    );
    if (queueable.length <= 1) return;

    const sorted = [...queueable].sort((a, b) => {
      const dirA = a.dir || "";
      const dirB = b.dir || "";
      const dirCompare = dirA.localeCompare(dirB);
      if (dirCompare !== 0) return dirCompare;

      const nameA = a.files[0]?.path?.split("/").pop() || "";
      const nameB = b.files[0]?.path?.split("/").pop() || "";
      return nameA.localeCompare(nameB);
    });

    const gids = sorted.map((t) => t.gid);
    try {
      await aria2Store.changePositions(gids, 0, "POS_SET");
    } catch (e) {
      console.error("Failed to rearrange download queue by directory:", e);
    }
  };

  return (
    <div
      ref={setContainerRef}
      class={`flex flex-col h-full space-y-4 ${isDragging() ? "select-none" : ""}`}
      onMouseDown={handleMouseDown}
    >
      <Show when={isDragging()}>
        <Portal>
          <div
            style={{
              position: "fixed",
              left: `${Math.min(dragStart().x, dragEnd().x)}px`,
              top: `${Math.min(dragStart().y, dragEnd().y)}px`,
              width: `${Math.abs(dragStart().x - dragEnd().x)}px`,
              height: `${Math.abs(dragStart().y - dragEnd().y)}px`,
              "background-color": "rgba(59, 130, 246, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.5)",
              "pointer-events": "none",
              "z-index": 9999,
            }}
          />
        </Portal>
      </Show>

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

      <DeleteConfirmModal
        isOpen={deleteConfirmTasks() !== null}
        tasksCount={deleteConfirmTasks()?.length || 0}
        forceDeleteChecked={forceDeleteChecked()}
        setForceDeleteChecked={setForceDeleteChecked}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmTasks(null)}
      />

      <TaskListHeader
        selectedTasks={selectedTasks()}
        setSelectedTasks={setSelectedTasks}
        filter={props.filter}
        setFilter={props.setFilter}
        searchQuery={searchQuery()}
        setSearchQuery={setSearchQuery}
        isShiftPressed={isShiftPressed()}
        onAddTaskClick={() => setIsModalOpen(true)}
        onDeleteTasksClick={(gids) => {
          setForceDeleteChecked(false);
          setDeleteConfirmTasks(gids);
        }}
        collapsedDirs={collapsedDirs()}
        toggleExpandCollapseAll={toggleExpandCollapseAll}
        arrangePriorityByDirectory={arrangePriorityByDirectory}
      />

      <TaskListTable
        selectedTasks={selectedTasks()}
        setSelectedTasks={setSelectedTasks}
        filteredTasks={filteredTasks()}
        groupedTasks={groupedTasks()}
        collapsedDirs={collapsedDirs()}
        toggleDirCollapse={toggleDirCollapse}
        toggleAll={toggleAll}
        toggleTask={toggleTask}
        sortKey={sortKey()}
        sortDirection={sortDirection()}
        toggleSort={toggleSort}
      />

      <div class="flex justify-end items-center gap-4 text-xs mt-4 pt-2 border-t border-base-200">
        <div class="flex items-center gap-2 font-medium opacity-80">
          <span>{t("task-list.filter.active")()}:</span>
          <span class="badge badge-sm badge-primary">{state.tasks.filter((t) => t.status === "active").length}</span>
        </div>
        <div class="flex items-center gap-2 font-medium opacity-80">
          <span>{t("task-list.filter.waiting")()}:</span>
          <span class="badge badge-sm badge-info text-info-content">{state.tasks.filter((t) => t.status === "paused" || t.status === "waiting").length}</span>
        </div>
        <div class="flex items-center gap-2 font-medium opacity-80">
          <span>{t("task-list.filter.stopped")()}:</span>
          <span class="badge badge-sm badge-ghost border border-base-300">{state.tasks.filter((t) => t.status === "complete" || t.status === "error").length}</span>
        </div>
        <div class="flex items-center gap-2 font-medium opacity-80">
          <span>{t("task-list.filter.all")()}:</span>
          <span class="badge badge-sm badge-neutral">{state.tasks.length}</span>
        </div>
      </div>
    </div>
  );
};

export default TaskList;
