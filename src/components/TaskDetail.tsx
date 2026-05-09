import { type Component, Show, createSignal } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { formatSize, formatSpeed } from "../utils/format";

const TaskDetail: Component = () => {
  const state = aria2Store.getState();
  const [isActionLoading, setIsActionLoading] = createSignal(false);

  const handleAction = async (action: "pause" | "resume") => {
    setIsActionLoading(true);
    const task = state.selectedTaskDetail;
    if (task) {
      if (action === "pause") await aria2Store.pauseTask(task.gid);
      else await aria2Store.resumeTask(task.gid);
    }
    setIsActionLoading(false);
  };

  const handleSpeedChange = async (type: "down" | "up", value: string) => {
    const task = state.selectedTaskDetail;
    if (!task) return;
    const limit = parseInt(value) * 1024; // Convert KB to bytes
    if (isNaN(limit)) return;

    if (type === "down") {
      await aria2Store.limitDownloadSpeed(task.gid, limit);
    } else {
      await aria2Store.limitUploadSpeed(task.gid, limit);
    }
  };

  return (
    <Show
      when={state.selectedTaskDetail}
      fallback={
        <div class="text-center py-10 opacity-50">
          {t("task-detail.empty")()}
        </div>
      }
    >
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">{t("task-detail.title")()}</h2>
          <div
            class={`badge ${
              state.selectedTaskDetail?.status === "active"
                ? "badge-primary"
                : "badge-ghost"
            }`}
          >
            {state.selectedTaskDetail?.status.toUpperCase()}
          </div>
        </div>

        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body p-0">
            <table class="table w-full">
              <tbody>
                <tr>
                  <th class="text-xs opacity-50 w-1/3">
                    {t("task-detail.gid")()}
                  </th>
                  <td class="font-mono text-xs truncate">
                    {state.selectedTaskDetail?.gid}
                  </td>
                </tr>
                <tr>
                  <th class="text-xs opacity-50">
                    {t("task-detail.progress")()}
                  </th>
                  <td>
                    <div class="flex items-center gap-3">
                      <progress
                        class="progress progress-primary w-full max-w-xs"
                        value={state.selectedTaskDetail!.completedLength}
                        max={state.selectedTaskDetail!.totalLength || 1}
                      ></progress>
                      <span class="text-xs w-8">
                        {Math.round(
                          (state.selectedTaskDetail!.completedLength /
                            (state.selectedTaskDetail!.totalLength || 1)) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th class="text-xs opacity-50">
                    {t("task-detail.totalSize")()}
                  </th>
                  <td class="text-sm">
                    {formatSize(Number(state.selectedTaskDetail!.totalLength))}
                  </td>
                </tr>
                <tr>
                  <th class="text-xs opacity-50">
                    {t("task-detail.downSpeed")()}
                  </th>
                  <td class="text-sm">
                    {formatSpeed(
                      Number(state.selectedTaskDetail!.downloadSpeed),
                    )}
                  </td>
                </tr>
                <tr>
                  <th class="text-xs opacity-50">
                    {t("task-detail.upSpeed")()}
                  </th>
                  <td class="text-sm">
                    {formatSpeed(Number(state.selectedTaskDetail!.uploadSpeed))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body">
            <h4 class="text-sm font-bold mb-4">
              {t("task-detail.speedLimits")()}
            </h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text text-xs">
                    {t("task-detail.downLimit")()} (KB/s)
                  </span>
                </label>
                <input
                  type="number"
                  placeholder={t("task-detail.unlimited")()}
                  onBlur={(e) =>
                    handleSpeedChange("down", e.currentTarget.value)
                  }
                  class="input input-bordered input-sm w-full"
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text text-xs">
                    {t("task-detail.upLimit")()} (KB/s)
                  </span>
                </label>
                <input
                  type="number"
                  placeholder={t("task-detail.unlimited")()}
                  onBlur={(e) => handleSpeedChange("up", e.currentTarget.value)}
                  class="input input-bordered input-sm w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body">
            <h4 class="text-sm font-bold mb-4">{t("task-detail.files")()}</h4>
            <div class="space-y-2">
              {state.selectedTaskDetail?.files?.map((file: any) => (
                <div class="flex justify-between items-center p-2 bg-base-200 rounded-lg text-xs">
                  <span class="truncate mr-2" title={file.path}>
                    {file.path.split("/").pop()}
                  </span>
                  <span class="opacity-60 whitespace-nowrap">
                    {formatSize(Number(file.length))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div class="flex gap-2 pt-4">
          <button
            onClick={() =>
              handleAction(
                state.selectedTaskDetail?.status === "active"
                  ? "pause"
                  : "resume",
              )
            }
            disabled={isActionLoading()}
            class={`btn flex-1 ${
              state.selectedTaskDetail?.status === "active"
                ? "btn-warning"
                : "btn-success"
            }`}
          >
            {isActionLoading()
              ? t("common.processing")()
              : state.selectedTaskDetail?.status === "active"
                ? t("task-detail.pause")()
                : t("task-detail.resume")()}
          </button>
          <button
            onClick={() => aria2Store.removeTask(state.selectedTaskDetail!.gid)}
            class="btn btn-error btn-outline"
          >
            {t("common.delete")()}
          </button>
        </div>
      </div>
    </Show>
  );
};

export default TaskDetail;
