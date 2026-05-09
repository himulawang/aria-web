import { For, createSignal, type Component } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { formatSpeed } from "../utils/format";

const TaskItem: Component<{ task: any }> = (props) => {
  const state = aria2Store.getState();

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

  const status = getStatusStyle(props.task.status);
  const progress =
    props.task.totalLength > 0
      ? Math.min(
          100,
          Math.round(
            (props.task.completedLength / props.task.totalLength) * 100,
          ),
        )
      : 0;

  return (
    <tr
      onClick={() => {
        if (state.selectedTaskId !== props.task.gid) {
          aria2Store.setSelectedTask(props.task.gid);
        }
      }}
      class={`hover cursor-pointer ${
        state.selectedTaskId === props.task.gid ? "bg-base-200" : ""
      }`}
    >
      <td class="font-medium">
        <div class="flex flex-col gap-1">
          <span class="truncate max-w-xs block">
            {props.task.files[0]?.path?.split("/").pop() ||
              t("task-status.unknown")()}
          </span>
          <div class="flex items-center gap-2">
            <span class={`badge badge-xs ${status}`}>
              {t("task-status." + props.task.status)() || props.task.status}
            </span>
            <span class="text-xs opacity-50">
              {formatSpeed(Number(props.task.downloadSpeed))}
            </span>
          </div>
        </div>
      </td>
      <td>
        <div class="flex items-center gap-2">
          <progress
            class="progress progress-primary w-24"
            value={progress}
            max="100"
          ></progress>
          <span class="text-xs">{progress}%</span>
        </div>
      </td>
      <td class="text-right flex justify-end gap-2">
        <Show when={props.task.status !== "active"}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              aria2Store.removeDownloadResult(props.task.gid);
            }}
            class="btn btn-xs btn-ghost btn-error"
          >
            {t("common.delete")()}
          </button>
        </Show>
        {props.task.status}
      </td>
    </tr>
  );
};

const TaskList: Component = () => {
  const state = aria2Store.getState();
  const [selectedTasks, setSelectedTasks] = createSignal<Set<string>>(
    new Set(),
  );
  const [filter, setFilter] = createSignal<
    "all" | "active" | "waiting" | "stopped"
  >("all");

  const toggleTask = (gid: string) => {
    const next = new Set(selectedTasks());
    if (next.has(gid)) next.delete(gid);
    else next.add(gid);
    setSelectedTasks(next);
  };

  const toggleAll = () => {
    if (selectedTasks().size === filteredTasks().length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks().map((t) => t.gid)));
    }
  };

  const filteredTasks = () => {
    const tasks = state.tasks;
    if (filter() === "all") return tasks;
    if (filter() === "active")
      return tasks.filter((t) => t.status === "active");
    if (filter() === "waiting")
      return tasks.filter((t) => t.status === "paused");
    if (filter() === "stopped")
      return tasks.filter(
        (t) => t.status === "complete" || t.status === "error",
      );
    return tasks;
  };

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-bold">{t("task-list.title")()}</h3>
        <div class="flex items-center gap-2">
          <button
            onClick={async () => {
              await aria2Store.client!.request("aria2.pauseAll");
              await aria2Store.fetchTasks();
            }}
            class="btn btn-sm btn-warning btn-outline"
          >
            {t("common.pause-all")()}
          </button>
          <button
            onClick={async () => {
              await aria2Store.client!.request("aria2.unpauseAll");
              await aria2Store.fetchTasks();
            }}
            class="btn btn-sm btn-success btn-outline"
          >
            {t("common.resume-all")()}
          </button>
          <button
            onClick={async () => {
              await aria2Store.client!.request("aria2.purgeDownloadResult");
              await aria2Store.fetchTasks();
            }}
            class="btn btn-sm btn-error btn-outline"
          >
            {t("common.purge-all")()}
          </button>
          <button
            onClick={() => aria2Store.fetchTasks()}
            class="btn btn-sm btn-outline"
          >
            {t("common.refresh")()}
          </button>
        </div>
      </div>

      <div class="tabs tabs-boxed gap-1">
        {[
          { id: "all", label: t("task-list.filter.all") },
          { id: "active", label: t("task-list.filter.active") },
          { id: "waiting", label: t("task-list.filter.waiting") },
          { id: "stopped", label: t("task-list.filter.stopped") },
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
              <th>Task</th>
              <th>Progress</th>
              <th class="text-right">Status</th>
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
                  class={`hover cursor-pointer ${
                    state.selectedTaskId === task.gid ? "bg-base-200" : ""
                  }`}
                >
                  <td>
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
                  <td class="font-medium">
                    <div class="flex flex-col gap-1">
                      <span class="truncate max-w-xs block">
                        {task.files[0]?.path?.split("/").pop() ||
                          t("task-status.unknown")()}
                      </span>
                      <div class="flex items-center gap-2">
                        <span
                          class={`badge badge-xs ${task.status === "active" ? "badge-primary" : task.status === "paused" ? "badge-warning" : task.status === "complete" ? "badge-success" : task.status === "error" ? "badge-error" : "badge-ghost"}`}
                        >
                          {t("task-status." + task.status)() || task.status}
                        </span>
                        <span class="text-xs opacity-50">
                          {formatSpeed(Number(task.downloadSpeed))}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <progress
                        class="progress progress-primary w-24"
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
                  <td class="text-right flex justify-end gap-2">
                    <Show when={task.status !== "active"}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          aria2Store.removeDownloadResult(task.gid);
                        }}
                        class="btn btn-xs btn-ghost btn-error"
                      >
                        {t("common.delete")()}
                      </button>
                    </Show>
                    {task.status}
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
