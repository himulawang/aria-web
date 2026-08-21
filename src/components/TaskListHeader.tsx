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
  HiOutlineQuestionMarkCircle,
  HiOutlineBolt,
  HiOutlineSparkles,
  HiOutlineArrowPath,
  HiOutlineArrowPathRoundedSquare,
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
                  title={t("task-list.arrange-by-dir-natural")()}
                >
                  <HiOutlineQueueList class="w-5 h-5" />
                </button>

                <button
                  onClick={async () => {
                    await aria2Store.manualInterleaveQueue();
                  }}
                  class="btn btn-sm btn-ghost btn-square text-primary"
                  title={t("scheduler.interleaveNow")() || "按网盘来源智能交错排队"}
                >
                  <HiOutlineArrowPathRoundedSquare class="w-5 h-5" />
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

            {/* Natural Sort Selected Tasks */}
            <button
              onClick={async () => {
                const gids = getMovableGids();
                if (gids.length > 0) {
                  await aria2Store.sortSelectedTasksNaturally(gids);
                }
              }}
              class="btn btn-sm btn-ghost btn-square text-warning"
              title={t("task-list.sort-selected-natural")()}
              disabled={getMovableGids().length <= 1}
            >
              <HiOutlineSparkles class="w-5 h-5" />
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

          {/* Retry all failed tasks button */}
          <Show when={state.tasks.some((t) => t.status === "error")}>
            <button
              onClick={async () => {
                await aria2Store.retryAllErrorTasks();
              }}
              class="btn btn-sm btn-ghost btn-square text-warning"
              title={t("task-list.retry-all-failed")() || "一键重试所有失败任务 (Retry all failed tasks)"}
            >
              <HiOutlineArrowPath class="w-5 h-5" />
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
        <div class="flex items-center gap-1.5">
          <input
            id="task-search-input"
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
          <button
            type="button"
            onClick={() => {
              if (props.searchQuery === "^0.\\.mp4$|^第.集.mp4$") {
                props.setSearchQuery("");
              } else {
                props.setSearchQuery("^0.\\.mp4$|^第.集.mp4$");
              }
            }}
            class={`btn btn-sm btn-square transition-colors ${
              props.searchQuery === "^0.\\.mp4$|^第.集.mp4$"
                ? "btn-primary text-primary-content shadow-sm"
                : "btn-ghost text-base-content/70 hover:text-primary"
            }`}
            title={
              props.searchQuery === "^0.\\.mp4$|^第.集.mp4$"
                ? "取消快捷规则 (Clear filter)"
                : "快捷规则: ^0.\\.mp4$|^第.集.mp4$"
            }
          >
            <HiOutlineBolt class="w-4 h-4" />
          </button>
          <div class="dropdown dropdown-hover dropdown-end">
            <div
              tabindex="0"
              role="button"
              class="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-primary"
              title="搜索技巧 (Search Help)"
            >
              <HiOutlineQuestionMarkCircle class="w-4 h-4" />
            </div>
            <div
              tabindex="0"
              class="dropdown-content z-[100] card card-compact w-72 p-3 shadow-xl bg-base-100 border border-base-300 text-xs space-y-2 mt-1"
            >
              <div class="font-bold text-primary border-b border-base-200 pb-1">
                🔍 搜索语法说明 (Search Syntax)
              </div>
              <div>
                <span class="font-semibold text-secondary">1. 通配符 (Wildcards):</span>
                <ul class="list-disc list-inside text-base-content/80 pl-1 space-y-0.5 mt-0.5">
                  <li><code class="bg-base-200 px-1 rounded">*.mp4</code> : 匹配所有 mp4 结尾</li>
                  <li><code class="bg-base-200 px-1 rounded">ubuntu?</code> : 匹配 ubuntu1, ubuntuA</li>
                </ul>
              </div>
              <div>
                <span class="font-semibold text-secondary">2. 正则表达式 (Regex):</span>
                <ul class="list-disc list-inside text-base-content/80 pl-1 space-y-0.5 mt-0.5">
                  <li><code class="bg-base-200 px-1 rounded">/ubuntu-\d+/i</code> : 正则字面量</li>
                  <li><code class="bg-base-200 px-1 rounded">^\d{4}</code> : 4位数字开头</li>
                </ul>
              </div>
              <div>
                <span class="font-semibold text-secondary">3. 普通关键词:</span>
                <p class="text-base-content/80 mt-0.5 pl-1">模糊匹配文件名、目录及 GID。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskListHeader;
