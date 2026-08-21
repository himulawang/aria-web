import { type Component, For, Show, createMemo } from "solid-js";
import { aria2Store } from "../store";
import { notificationStore } from "../store/notification-store";
import { t } from "../i18n";
import { formatSpeed, formatSize } from "../utils/format";
import { matchTaskRule } from "../utils/scheduler-engine";
import {
  HiOutlineChevronDown,
  HiOutlineFolder,
  HiOutlineFolderOpen,
  HiOutlineInformationCircle,
  HiOutlineSparkles,
  HiOutlineChevronDoubleUp,
  HiOutlineChevronDoubleDown,
} from "solid-icons/hi";

interface TaskListTableProps {
  selectedTasks: Set<string>;
  setSelectedTasks: (s: Set<string>) => void;
  filteredTasks: any[];
  groupedTasks: any[];
  collapsedDirs: Set<string>;
  toggleDirCollapse: (dir: string) => void;
  toggleAll: () => void;
  toggleTask: (gid: string) => void;
  sortKey: string | null;
  sortDirection: "asc" | "desc";
  toggleSort: (key: string) => void;
}

const TaskListTable: Component<TaskListTableProps> = (props) => {
  const state = aria2Store.getState();

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "badge-primary";
      case "paused":
        return "badge-warning";
      case "waiting":
        return "badge-info";
      case "complete":
        return "badge-success";
      case "error":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  const queueRankMap = createMemo(() => {
    const map = new Map<string, { type: "active" | "waiting"; rank: number }>();
    let activeIndex = 1;
    let waitingIndex = 1;

    for (const task of state.tasks) {
      if (task.status === "active") {
        map.set(task.gid, { type: "active", rank: activeIndex++ });
      } else if (task.status === "waiting" || task.status === "paused") {
        map.set(task.gid, { type: "waiting", rank: waitingIndex++ });
      }
    }
    return map;
  });

  return (
    <div class="overflow-auto flex-1 bg-base-100 rounded-box border border-base-300">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                onClick={props.toggleAll}
                checked={
                  props.filteredTasks.length > 0 &&
                  props.filteredTasks.every((t) => props.selectedTasks.has(t.gid))
                }
              />
            </th>
            <th class="cursor-pointer hover:text-primary" onClick={() => props.toggleSort("name")}>
              {t("task-list.title")()}{" "}
              {props.sortKey === "name" && (props.sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th class="cursor-pointer hover:text-primary" onClick={() => props.toggleSort("size")}>
              {t("task-detail.totalSize")().replace(/[:：]/g, "")}{" "}
              {props.sortKey === "size" && (props.sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th class="cursor-pointer hover:text-primary" onClick={() => props.toggleSort("progress")}>
              {t("task-detail.progress")()}{" "}
              {props.sortKey === "progress" && (props.sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th class="text-right cursor-pointer hover:text-primary" onClick={() => props.toggleSort("status")}>
              {t("nav.status")()}{" "}
              {props.sortKey === "status" && (props.sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th class="text-left">{t("task-detail.directory")()}</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.groupedTasks}>
            {(group) => {
              const allChecked = () => group.tasks.every((t: any) => props.selectedTasks.has(t.gid));

              return (
                <>
                  {/* Folder Header Row */}
                  <tr
                    class="bg-base-200/40 hover:bg-base-200/70 border-b border-base-200 cursor-pointer font-medium select-none"
                    onClick={() => props.toggleDirCollapse(group.dir)}
                  >
                    <td
                      class="p-2 cursor-pointer"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = new Set(props.selectedTasks);
                        if (allChecked()) {
                          group.tasks.forEach((t: any) => next.delete(t.gid));
                        } else {
                          group.tasks.forEach((t: any) => next.add(t.gid));
                        }
                        props.setSelectedTasks(next);
                      }}
                    >
                      <input
                        type="checkbox"
                        class="checkbox checkbox-sm checkbox-secondary pointer-events-none"
                        checked={allChecked()}
                        ref={(el) => {
                          el.indeterminate =
                            group.tasks.some((t: any) => props.selectedTasks.has(t.gid)) &&
                            !group.tasks.every((t: any) => props.selectedTasks.has(t.gid));
                        }}
                      />
                    </td>
                    <td class="p-2">
                      <div class="flex items-center gap-2">
                        <HiOutlineChevronDown
                          class={`w-4 h-4 text-base-content/50 transition-transform duration-200 ${
                            props.collapsedDirs.has(group.dir) ? "-rotate-90" : ""
                          }`}
                        />
                        <Show
                          when={props.collapsedDirs.has(group.dir)}
                          fallback={<HiOutlineFolderOpen class="w-5 h-5 text-warning shrink-0" />}
                        >
                          <HiOutlineFolder class="w-5 h-5 text-warning shrink-0" />
                        </Show>
                        <span class="truncate max-w-sm block text-sm font-semibold">
                          {group.dir.split("/").pop() || group.dir}
                        </span>
                        <span class="badge badge-sm badge-ghost text-xs opacity-60">
                          {group.tasks.length}
                        </span>
                      </div>
                    </td>
                    <td class="p-2 text-sm font-semibold">
                      {formatSize(group.totalSize)}
                    </td>
                    <td class="p-2">
                      <div class="flex items-center gap-2">
                        <progress
                          class="progress progress-secondary w-24 h-2"
                          value={group.progressPercent}
                          max="100"
                        ></progress>
                        <span class="text-xs">{group.progressPercent}%</span>
                      </div>
                    </td>
                    <td class="p-2 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <Show when={group.totalSpeed > 0}>
                          <span class="text-xs opacity-60 font-semibold text-success w-20 text-right font-mono inline-block">
                            {formatSpeed(group.totalSpeed)}
                          </span>
                        </Show>
                        <Show when={group.activeCount > 0}>
                          <span class="badge badge-sm badge-primary text-xs shrink-0 font-mono" title={t("task-list.queue-active")()}>
                            ⚡ {group.activeCount}
                          </span>
                        </Show>
                        {(() => {
                          const ranks = group.tasks
                            .map((t: any) => queueRankMap().get(t.gid))
                            .filter((r: any) => r && r.type === "waiting")
                            .map((r: any) => r.rank);
                          if (ranks.length === 0) return null;
                          const min = Math.min(...ranks);
                          const max = Math.max(...ranks);
                          const label = min === max ? `#${min}` : `#${min}~#${max}`;
                          return (
                            <span
                              class="badge badge-sm badge-outline badge-info text-xs shrink-0 font-mono"
                              title={t("task-list.queue-rank")()}
                            >
                              {label}
                            </span>
                          );
                        })()}

                        {/* Directory Quick Actions: Natural Sort & Priority Shift */}
                        <div class="flex items-center gap-0.5 ml-1" onMouseDown={(e) => e.stopPropagation()}>
                          <button
                            class="btn btn-xs btn-ghost btn-square text-warning hover:bg-warning/20"
                            title={t("task-list.sort-directory-natural")()}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await aria2Store.sortDirectoryTasksNaturally(group.dir);
                              notificationStore.add(
                                `${t("task-list.sort-directory-natural")()}: ${group.dir.split("/").pop() || group.dir}`,
                                "success",
                              );
                            }}
                          >
                            <HiOutlineSparkles class="w-4 h-4" />
                          </button>
                          <button
                            class="btn btn-xs btn-ghost btn-square text-info hover:bg-info/20"
                            title={t("task-list.move-dir-top")()}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await aria2Store.moveDirectoryTasksToTop(group.dir);
                              notificationStore.add(
                                `${t("task-list.move-dir-top")()}: ${group.dir.split("/").pop() || group.dir}`,
                                "info",
                              );
                            }}
                          >
                            <HiOutlineChevronDoubleUp class="w-4 h-4" />
                          </button>
                          <button
                            class="btn btn-xs btn-ghost btn-square text-info hover:bg-info/20"
                            title={t("task-list.move-dir-bottom")()}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await aria2Store.moveDirectoryTasksToBottom(group.dir);
                              notificationStore.add(
                                `${t("task-list.move-dir-bottom")()}: ${group.dir.split("/").pop() || group.dir}`,
                                "info",
                              );
                            }}
                          >
                            <HiOutlineChevronDoubleDown class="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td class="p-2 text-left text-xs max-w-[200px] truncate opacity-50" title={group.dir}>
                      {group.dir}
                    </td>
                  </tr>

                  {/* Child Task Rows */}
                  <Show when={!props.collapsedDirs.has(group.dir)}>
                    <For each={group.tasks}>
                      {(task) => (
                        <tr
                          data-gid={task.gid}
                          onClick={() => {
                            if (state.selectedTaskId !== task.gid) {
                              aria2Store.setSelectedTask(task.gid);
                            }
                          }}
                          class={`hover cursor-pointer transition-all duration-300 ${
                            state.selectedTaskId === task.gid ? "bg-base-200" : ""
                          }`}
                          style="min-height: 32px;"
                        >
                          <td
                            class="p-2 pl-4 cursor-pointer"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              props.toggleTask(task.gid);
                            }}
                          >
                            <input
                              type="checkbox"
                              class="checkbox checkbox-sm pointer-events-none"
                              checked={props.selectedTasks.has(task.gid)}
                            />
                          </td>
                          <td class="p-2 pl-8">
                            <div class="flex items-center gap-2">
                              <span class="text-base-content/30 select-none">└─</span>
                              {(() => {
                                const info = queueRankMap().get(task.gid);
                                if (!info) return null;
                                if (info.type === "active") {
                                  return (
                                    <span
                                      class="badge badge-xs badge-primary font-mono shrink-0 px-1 font-bold"
                                      title={`${t("task-list.queue-active")()} #${info.rank}`}
                                    >
                                      ⚡ #{info.rank}
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    class={`badge badge-xs font-mono shrink-0 px-1 ${
                                      info.rank <= 3
                                        ? "badge-secondary font-bold"
                                        : "badge-ghost opacity-80"
                                    }`}
                                    title={`${t("task-list.queue-rank")()} #${info.rank}`}
                                  >
                                    #{info.rank}
                                  </span>
                                );
                              })()}
                                {(() => {
                                  const rule = matchTaskRule(task, state.schedulerConfig.rules || []);
                                  if (!rule) return null;
                                  return (
                                    <span
                                      class="badge badge-xs font-semibold shrink-0 text-white"
                                      style={{ "background-color": rule.badgeColor || "#3b82f6" }}
                                      title={`来源规则: ${rule.name}`}
                                    >
                                      {rule.name}
                                    </span>
                                  );
                                })()}
                                <span class="truncate max-w-sm block text-sm font-medium text-base-content/90">
                                  {task.files[0]?.path?.split("/").pop() ||
                                    t("task-status.unknown")()}
                                </span>
                            </div>
                          </td>
                          <td class="p-2 text-sm text-base-content/70">
                            {formatSize(Number(task.totalLength))}
                          </td>
                          <td class="p-2">
                            <div class="flex items-center gap-2 opacity-90">
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
                              <Show when={task.status === "active"}>
                                <span class="text-xs opacity-50 w-24 text-right font-mono inline-block">
                                  {formatSpeed(Number(task.downloadSpeed))}
                                </span>
                              </Show>
                              <span class={`badge badge-sm ${getStatusStyle(task.status)}`}>
                                {t(`task-status.${task.status}`)()}
                              </span>
                              <button
                                title={t("task-detail.title")()}
                                class="btn btn-xs btn-ghost btn-square text-primary"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  aria2Store.showTaskDetail(task.gid);
                                }}
                              >
                                <HiOutlineInformationCircle class="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td class="p-2 text-left text-xs max-w-[200px] truncate">
                            {/* Keep blank for child task directory column to avoid duplication */}
                          </td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </>
              );
            }}
          </For>
        </tbody>
      </table>
    </div>
  );
};

export default TaskListTable;

