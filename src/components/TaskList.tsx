import { For, createSignal, type Component, Show } from "solid-js";
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
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [sortKey, setSortKey] = createSignal<string | null>(null);
  const [sortDirection, setSortDirection] = createSignal<"asc" | "desc">("asc");
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

  const toggleSort = (key: string) => {
    if (sortKey() === key) {
      setSortDirection(sortDirection() === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };
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

          <button
            onClick={() => setIsModalOpen(true)}
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
              <th class="cursor-pointer hover:text-primary" onClick={() => toggleSort("name")}>{t("task-list.title")()} {sortKey() === "name" <th>{t("task-list.title")()}</th><th>{t("task-list.title")()}</th> (sortDirection() === "asc" ? "↑" : "↓")}</th>
              <th class="cursor-pointer hover:text-primary" onClick={() => toggleSort("progress")}>{t("task-detail.progress")()} {sortKey() === "progress" <th>{t("task-detail.progress")()}</th><th>{t("task-detail.progress")()}</th> (sortDirection() === "asc" ? "↑" : "↓")}</th>
              <th class="text-right cursor-pointer hover:text-primary" onClick={() => toggleSort("status")}>{t("nav.status")()} {sortKey() === "status" <th class="text-right">{t("nav.status")()}</th><th class="text-right">{t("nav.status")()}</th> (sortDirection() === "asc" ? "↑" : "↓")}</th>
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
