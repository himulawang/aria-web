import { type Component, Show, For } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import {
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineFolder,
  HiOutlineFolderOpen,
  HiOutlineQueueList,
  HiOutlineForward,
  HiOutlineXMark,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronDoubleUp,
  HiOutlineChevronDoubleDown,
} from "solid-icons/hi";
import { FaSolidBroom } from "solid-icons/fa";

interface TaskListHeaderProps {
  selectedTasks: Set<string>;
  setSelectedTasks: (s: Set<string>) => void;
  filter: "all" | "active" | "waiting" | "stopped";
  setFilter: (f: "all" | "active" | "waiting" | "stopped") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isShiftPressed: boolean;
  onAddTaskClick: () => void;
  onDeleteTasksClick: (gids: string[]) => void;
  collapsedDirs: Set<string>;
  toggleExpandCollapseAll: () => void;
  arrangePriorityByDirectory: () => void;
}

const TaskListHeader: Component<TaskListHeaderProps> = (props) => {
  const state = aria2Store.getState();

  const hasActiveTasks = () =>
    Array.from(props.selectedTasks).some(
      (gid) =>
        state.tasks.find((t) => t.gid === gid)?.status === "active" ||
        state.tasks.find((t) => t.gid === gid)?.status === "waiting",
    );

  const hasNonCompletedTasks = () =>
    Array.from(props.selectedTasks).some(
      (gid) =>
        state.tasks.find((t) => t.gid === gid)?.status !== "complete" &&
        state.tasks.find((t) => t.gid === gid)?.status !== "error",
    );

  const getMovableGids = () => {
    return Array.from(props.selectedTasks).filter((gid) => {
      const task = state.tasks.find((t) => t.gid === gid);
      return task && (task.status === "paused" || task.status === "waiting");
    });
  };

  const getUniqueDirsCount = () => {
    return new Set(state.tasks.map((t) => t.dir || "Default")).size;
  };

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <h3 class="text-xl font-bold">{t("task-list.title")()}</h3>
        </div>
        <div class="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          <Show
            when={props.selectedTasks.size > 0}
            fallback={
              <>
                <button
                  onClick={props.onAddTaskClick}
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
                  onClick={props.toggleExpandCollapseAll}
                  class="btn btn-sm btn-ghost btn-square"
                  title={
                    props.collapsedDirs.size === getUniqueDirsCount()
                      ? "Expand All Folders"
                      : "Collapse All Folders"
                  }
                >
                  <Show
                    when={props.collapsedDirs.size === getUniqueDirsCount()}
                    fallback={<HiOutlineFolderOpen class="w-5 h-5 text-warning" />}
                  >
                    <HiOutlineFolder class="w-5 h-5 text-warning opacity-60" />
                  </Show>
                </button>

                <button
                  onClick={props.arrangePriorityByDirectory}
                  class="btn btn-sm btn-ghost btn-square text-info"
                  title="Arrange Download Queue by Directory"
                >
                  <HiOutlineQueueList class="w-5 h-5" />
                </button>
              </>
            }
          >
            <span class="text-xs font-semibold px-2 py-1 bg-base-300 rounded-lg flex items-center gap-1 mr-1">
              {props.selectedTasks.size} Selected
              <button
                onClick={() => props.setSelectedTasks(new Set<string>())}
                class="btn btn-xs btn-ghost btn-circle text-opacity-50 hover:text-opacity-100 p-0 h-4 w-4 min-h-0"
                title="Clear Selection"
              >
                <HiOutlineXMark class="w-3 h-3" />
              </button>
            </span>
            <button
              onClick={async () => {
                const gids = Array.from(props.selectedTasks);
                if (gids.length > 0) {
                  if (props.isShiftPressed) {
                    await aria2Store.forcePauseTasks(gids);
                  } else {
                    await aria2Store.pauseTasks(gids);
                  }
                }
              }}
              class={`btn btn-sm btn-ghost btn-square transition-all ${
                props.isShiftPressed ? "text-warning border border-warning/30 bg-warning/5" : ""
              }`}
              title={props.isShiftPressed ? "Force Pause Selected (Shift-click)" : t("task-detail.pause")()}
              disabled={!hasActiveTasks()}
            >
              <HiOutlinePause class="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                const gids = Array.from(props.selectedTasks);
                if (gids.length > 0) {
                  await aria2Store.resumeTasks(gids);
                }
              }}
              class="btn btn-sm btn-ghost btn-square"
              title={t("task-detail.resume")()}
              disabled={!hasNonCompletedTasks()}
            >
              <HiOutlinePlay class="w-5 h-5" />
            </button>

            {/* Batch Move Buttons */}
            <button
              onClick={async () => {
                const gids = getMovableGids();
                if (gids.length > 0) {
                  await aria2Store.changePositions(gids, 0, "POS_SET");
                }
              }}
              class="btn btn-sm btn-ghost btn-square text-info"
              title="Move Selected to Top"
              disabled={getMovableGids().length === 0}
            >
              <HiOutlineChevronDoubleUp class="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                const gids = getMovableGids();
                if (gids.length > 0) {
                  await aria2Store.changePositions(gids, -1, "POS_CUR");
                }
              }}
              class="btn btn-sm btn-ghost btn-square text-info"
              title="Move Selected Up"
              disabled={getMovableGids().length === 0}
            >
              <HiOutlineChevronUp class="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                const gids = getMovableGids();
                if (gids.length > 0) {
                  await aria2Store.changePositions(gids, 1, "POS_CUR");
                }
              }}
              class="btn btn-sm btn-ghost btn-square text-info"
              title="Move Selected Down"
              disabled={getMovableGids().length === 0}
            >
              <HiOutlineChevronDown class="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                const gids = getMovableGids();
                if (gids.length > 0) {
                  await aria2Store.changePositions(gids, 0, "POS_END");
                }
              }}
              class="btn btn-sm btn-ghost btn-square text-info"
              title="Move Selected to Bottom"
              disabled={getMovableGids().length === 0}
            >
              <HiOutlineChevronDoubleDown class="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                const gids = Array.from(props.selectedTasks);
                props.onDeleteTasksClick(gids);
              }}
              class={`btn btn-sm btn-ghost btn-square text-error transition-all ${
                props.isShiftPressed ? "border border-error/30 bg-error/5 animate-pulse" : ""
              }`}
              title={props.isShiftPressed ? "Force Delete Selected (Shift-click)" : t("common.delete")()}
            >
              <HiOutlineTrash class="w-5 h-5" />
            </button>
          </Show>

          <button
            onClick={async () => {
              await aria2Store.purgeDownloadResult();
            }}
            class="btn btn-sm btn-ghost btn-square text-error/80"
            title="Purge Completed/Stopped Tasks"
          >
            <FaSolidBroom class="w-5 h-5" />
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4">
        <div class="tabs tabs-boxed gap-1 flex justify-start">
          <For
            each={[
              { id: "active", label: t("task-list.filter.active") },
              { id: "waiting", label: t("task-list.filter.waiting") },
              { id: "stopped", label: t("task-list.filter.stopped") },
              { id: "all", label: t("task-list.filter.all") },
            ]}
          >
            {(tab) => (
              <button
                onClick={() => props.setFilter(tab.id as any)}
                class={`tab ${props.filter === tab.id ? "tab-active" : ""}`}
              >
                {tab.label()}
              </button>
            )}
          </For>
        </div>
        <input
          type="text"
          placeholder={t("task-list.search")()}
          class="input input-sm input-bordered max-w-xs"
          value={props.searchQuery}
          onInput={(e) => props.setSearchQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              props.setSearchQuery("");
              e.currentTarget.blur();
            }
          }}
        />
      </div>
    </div>
  );
};

export default TaskListHeader;
