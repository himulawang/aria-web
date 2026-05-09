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
      <td class="text-right opacity-70">{props.task.status}</td>
    </tr>
  );
};

const TaskList: Component = () => {
  const state = aria2Store.getState();
  const [filter, setFilter] = createSignal<
    "all" | "active" | "waiting" | "stopped"
  >("all");

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
        <button
          onClick={() => aria2Store.fetchTasks()}
          class="btn btn-sm btn-outline"
        >
          {t("common.refresh")()}
        </button>
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
              <th>Task</th>
              <th>Progress</th>
              <th class="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            <For each={filteredTasks()}>
              {(task) => <TaskItem task={task} />}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;
