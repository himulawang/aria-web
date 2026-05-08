import { For, createSignal, type Component } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { formatSize, formatSpeed } from "../utils/format";
import "./styles/task-list.css";

const TaskItem: Component<{ task: any }> = (props) => {
  const state = aria2Store.getState();

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return { color: "#2196f3", label: t("task-status.downloading")() };
      case "paused":
        return { color: "#ff9800", label: t("task-status.paused")() };
      case "complete":
        return { color: "#4caf50", label: t("task-status.completed")() };
      case "error":
        return { color: "#f44336", label: t("task-status.error")() };
      default:
        return { color: "#9e9e9e", label: status };
    }
  };

  const status = getStatusInfo(props.task.status);
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
    <div
      onClick={() => {
        if (state.selectedTaskId !== props.task.gid) {
          aria2Store.setSelectedTask(props.task.gid);
        }
      }}
      class={`task-item ${state.selectedTaskId === props.task.gid ? "selected" : ""}`}
    >
      <div class="task-item-top">
        <div
          class="status-indicator"
          style={{ "background-color": status.color }}
        />
        <div
          class={`task-name ${state.selectedTaskId === props.task.gid ? "bold" : ""}`}
        >
          {props.task.files[0]?.path?.split("/").pop() ||
            t("task-status.unknown")()}
        </div>
        <div class="status-label">{status.label}</div>
      </div>

      <div class="task-item-bottom">
        <div class="progress-container">
          <div
            class="progress-bar"
            style={{
              width: `${progress}%`,
              "background-color": status.color,
            }}
          />
        </div>
        <div class="progress-text">{progress}%</div>
        <div class="speed-text">
          {formatSpeed(Number(props.task.downloadSpeed))}
        </div>
      </div>
    </div>
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
    <div class="task-list-container">
      <div class="task-list-header">
        <h3 style={{ margin: 0 }}>{t("task-list.title")()}</h3>
        <button onClick={() => aria2Store.fetchTasks()} class="refresh-button">
          {t("common.refresh")()}
        </button>
      </div>

      <div class="filter-bar">
        {[
          { id: "all", label: t("task-list.filter.all") },
          { id: "active", label: t("task-list.filter.active") },
          { id: "waiting", label: t("task-list.filter.waiting") },
          { id: "stopped", label: t("task-list.filter.stopped") },
        ].map((tab) => (
          <button
            onClick={() => setFilter(tab.id as any)}
            class={`filter-tab ${filter() === tab.id ? "active" : "inactive"}`}
          >
            {tab.label()}
          </button>
        ))}
      </div>

      <div class="task-items-container">
        <For each={filteredTasks()}>{(task) => <TaskItem task={task} />}</For>
      </div>
    </div>
  );
};

export default TaskList;
