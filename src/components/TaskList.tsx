import { For, createSignal, type Component, Show } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { formatSpeed } from "../utils/format";
import {
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineTrash,
  HiOutlinePlus,
} from "solid-icons/hi";

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
  const [filter, setFilter] = createSignal<
    "all" | "active" | "waiting" | "stopped"
  >("active");

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
        <div class="flex items-center gap-1">
          <button
            onClick={() => {
              // Add task logic here
            }}
            class="btn btn-sm btn-ghost btn-square"
            title={t("common.add")()}
          >
            <HiOutlinePlus class="w-5 h-5" />
          </button>
          <button
            onClick={async () => {
              for (const gid of selectedTasks()) {
                await aria2Store.pauseTask(gid);
              }
              await aria2Store.fetchTasks();
            }}
            class="btn btn-sm btn-ghost btn-square"
            title={t("task-detail.pause")()}
            disabled={selectedTasks().size === 0 || !hasActiveTasks()}
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
            disabled={selectedTasks().size === 0 || !hasNonCompletedTasks()}
          >
            <HiOutlinePlay class="w-5 h-5" />
          </button>
          <button
            onClick={async () => {
              for (const gid of selectedTasks()) {
                await aria2Store.removeTask(gid);
              }
              setSelectedTasks(new Set());
              await aria2Store.fetchTasks();
            }}
            class="btn btn-sm btn-ghost btn-square text-error"
            title={t("common.delete")()}
            disabled={selectedTasks().size === 0}
          >
            <HiOutlineTrash class="w-5 h-5" />
          </button>
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
              <th>{t("task-list.title")()}</th>
              <th>{t("task-detail.progress")()}</th>
              <th class="text-right">{t("nav.status")()}</th>
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
