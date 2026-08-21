import { type Component, createSignal, createEffect } from "solid-js";
import { t } from "../../i18n";
import { notificationStore } from "../../store/notification-store";
import { HiOutlineArrowLeft, HiOutlineClipboard } from "solid-icons/hi";

interface TaskDetailExportProps {
  task: any;
  onCancel: () => void;
}

type ExportType = "cli" | "curl" | "wget" | "rpc";

export const TaskDetailExport: Component<TaskDetailExportProps> = (props) => {
  const [exportType, setExportType] = createSignal<ExportType>("cli");
  const [exportCommand, setExportCommand] = createSignal("");

  const getFirstUrl = () => {
    if (props.task?.urls?.[0]) return props.task.urls[0];
    return props.task?.files?.[0]?.uris?.[0]?.uri || "";
  };

  const getFileName = () => {
    return props.task?.out || props.task?.files?.[0]?.path?.split("/").pop() || "download";
  };

  createEffect(() => {
    const task = props.task;
    if (!task) return;

    const url = getFirstUrl();
    const fileName = getFileName();
    const type = exportType();

    if (type === "cli") {
      let cmd = `aria2c "${url}"`;
      if (task.dir) cmd += ` --dir="${task.dir}"`;
      if (fileName) cmd += ` --out="${fileName}"`;
      if (task.split) cmd += ` --split=${task.split}`;
      if (task.maxConnectionPerServer) cmd += ` --max-connection-per-server=${task.maxConnectionPerServer}`;
      setExportCommand(cmd);
    } else if (type === "curl") {
      let cmd = `curl -L "${url}" -o "${fileName}"`;
      if (task.header && Array.isArray(task.header)) {
        task.header.forEach((h: string) => {
          cmd += ` -H "${h}"`;
        });
      }
      setExportCommand(cmd);
    } else if (type === "wget") {
      let cmd = `wget -c -O "${fileName}" "${url}"`;
      if (task.header && Array.isArray(task.header)) {
        task.header.forEach((h: string) => {
          cmd += ` --header="${h}"`;
        });
      }
      setExportCommand(cmd);
    } else {
      const rpc = {
        method: "aria2.addUri",
        params: [
          "token:YOUR_TOKEN",
          [[url]],
          {
            dir: task.dir,
            out: fileName,
            split: task.split || "16",
          },
        ],
      };
      setExportCommand(JSON.stringify(rpc, null, 2));
    }
  });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportCommand());
      notificationStore.add("Command copied to clipboard", "success");
    } catch (err) {
      notificationStore.add("Failed to copy command", "error");
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      <div class="flex items-center gap-3">
        <button 
          onClick={props.onCancel} 
          class="btn btn-sm btn-ghost btn-circle"
        >
          <HiOutlineArrowLeft class="w-5 h-5" />
        </button>
        <h2 class="text-lg font-bold">{t("task-detail.show-api")()}</h2>
      </div>

      <div class="space-y-4 py-1">
        <div class="tabs tabs-boxed bg-base-200/50 p-1 gap-1">
          <button
            class={`tab tab-sm flex-1 font-semibold ${exportType() === "cli" ? "tab-active bg-base-100 shadow-sm" : ""}`}
            onClick={() => setExportType("cli")}
          >
            aria2c
          </button>
          <button
            class={`tab tab-sm flex-1 font-semibold ${exportType() === "curl" ? "tab-active bg-base-100 shadow-sm" : ""}`}
            onClick={() => setExportType("curl")}
          >
            cURL
          </button>
          <button
            class={`tab tab-sm flex-1 font-semibold ${exportType() === "wget" ? "tab-active bg-base-100 shadow-sm" : ""}`}
            onClick={() => setExportType("wget")}
          >
            Wget
          </button>
          <button
            class={`tab tab-sm flex-1 font-semibold ${exportType() === "rpc" ? "tab-active bg-base-100 shadow-sm" : ""}`}
            onClick={() => setExportType("rpc")}
          >
            JSON-RPC
          </button>
        </div>

        <div class="relative">
          <textarea
            class="textarea textarea-bordered w-full h-56 font-mono text-[10px] leading-relaxed p-3 bg-base-200/60"
            value={exportCommand()}
            readonly
          />
          <button
            class="btn btn-primary btn-xs absolute bottom-3 right-3 gap-1.5 shadow-md py-1 px-3 min-h-0 h-7"
            onClick={copyToClipboard}
          >
            <HiOutlineClipboard class="w-3.5 h-3.5" />
            Copy
          </button>
        </div>

        <button
          class="btn btn-sm btn-outline btn-block mt-2"
          onClick={props.onCancel}
        >
          Back to Details
        </button>
      </div>
    </>
  );
};
