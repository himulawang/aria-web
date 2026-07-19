import { type Component, Show } from "solid-js";
import { t } from "../../i18n";
import { formatSize, formatSpeed } from "../../utils/format";

interface TaskOverviewProps {
  task: any;
}

export const TaskOverview: Component<TaskOverviewProps> = (props) => {
  return (
    <div class="card bg-base-200/30 border border-base-300/60 rounded-xl overflow-hidden">
      <div class="p-0">
        <table class="table w-full text-xs">
          <tbody>
            <tr class="hover:bg-base-200/10 border-b border-base-200/50">
              <th class="text-xs opacity-60 w-1/3 py-3 px-4 font-semibold align-top">
                {t("task-detail.fileName")()}
              </th>
              <td class="break-all whitespace-normal py-3 px-4 font-medium pr-6 leading-relaxed">
                {props.task?.files?.[0]?.path
                  ?.split("/")
                  .pop() || t("task-status.unknown")()}
              </td>
            </tr>
            <tr class="hover:bg-base-200/10 border-b border-base-200/50">
              <th class="text-xs opacity-60 w-1/3 py-3 px-4 font-semibold align-top">
                {t("task-detail.directory")()}
              </th>
              <td class="break-all whitespace-normal py-3 px-4 opacity-80 leading-relaxed">
                {props.task?.dir}
              </td>
            </tr>
            <tr class="hover:bg-base-200/10 border-b border-base-200/50">
              <th class="text-xs opacity-60 py-3 px-4 font-semibold">
                {t("task-detail.progress")()}
              </th>
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <progress
                    class="progress progress-primary w-full h-2"
                    value={props.task?.completedLength || 0}
                    max={props.task?.totalLength || 1}
                  ></progress>
                  <span class="font-bold whitespace-nowrap">
                    {Math.round(
                      ((props.task?.completedLength || 0) /
                        (props.task?.totalLength || 1)) *
                        100,
                    )}
                    %
                  </span>
                </div>
              </td>
            </tr>
            <tr class="hover:bg-base-200/10 border-b border-base-200/50">
              <th class="text-xs opacity-60 py-3 px-4 font-semibold">
                {t("task-detail.totalSize")()}
              </th>
              <td class="py-3 px-4 font-medium">
                {formatSize(Number(props.task?.totalLength || 0))}
              </td>
            </tr>
            <Show when={props.task?.status === "active"}>
              <tr class="hover:bg-base-200/10 border-b border-base-200/50">
                <th class="text-xs opacity-60 py-3 px-4 font-semibold">
                  Speed
                </th>
                <td class="py-3 px-4 font-semibold text-success flex items-center gap-2">
                  <span>DL: {formatSpeed(Number(props.task.downloadSpeed || 0))}</span>
                  <Show when={props.task.bittorrent}>
                    <span class="text-info font-medium">UL: {formatSpeed(Number(props.task.uploadSpeed || 0))}</span>
                  </Show>
                </td>
              </tr>
            </Show>
            <tr class="hover:bg-base-200/10 border-none">
              <th class="text-xs opacity-60 py-3 px-4 font-semibold">
                GID
              </th>
              <td class="py-3 px-4 font-mono select-all text-[11px] opacity-75">
                {props.task?.gid}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
