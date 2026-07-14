import { type Component, For, Show, createEffect } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { formatSpeed, formatSize } from "../utils/format";
import {
  HiOutlineChevronDown,
  HiOutlineFolder,
  HiOutlineFolderOpen,
  HiOutlineInformationCircle,
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
                    <td class="p-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        class="checkbox checkbox-sm checkbox-secondary"
                        checked={allChecked()}
                        ref={(el) => {
                          createEffect(() => {
                            const count = group.tasks.filter((t: any) => props.selectedTasks.has(t.gid)).length;
                            el.indeterminate = count > 0 && count < group.tasks.length;
                          });
                        }}
                        onChange={() => {
                          const next = new Set(props.selectedTasks);
                          if (allChecked()) {
                            group.tasks.forEach((t: any) => next.delete(t.gid));
                          } else {
                            group.tasks.forEach((t: any) => next.add(t.gid));
                          }
                          props.setSelectedTasks(next);
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
                      <div class="flex items-center justify-end gap-2">
                        <Show when={group.totalSpeed > 0}>
                          <span class="text-xs opacity-60 font-semibold text-success w-24 text-right font-mono inline-block">
                            {formatSpeed(group.totalSpeed)}
                          </span>
                        </Show>
                        <Show when={group.activeCount > 0}>
                          <span class="badge badge-sm badge-primary text-xs shrink-0">
                            {group.activeCount} active
                          </span>
                        </Show>
                        <Show when={group.pausedCount > 0}>
                          <span class="badge badge-sm badge-warning text-xs shrink-0">
                            {group.pausedCount} paused
                          </span>
                        </Show>
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
                          <td class="p-2 pl-4">
                            <input
                              type="checkbox"
                              class="checkbox checkbox-sm"
                              checked={props.selectedTasks.has(task.gid)}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                props.toggleTask(task.gid);
                              }}
                            />
                          </td>
                          <td class="p-2 pl-8">
                            <div class="flex items-center gap-2">
                              <span class="text-base-content/30 select-none">└─</span>
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
