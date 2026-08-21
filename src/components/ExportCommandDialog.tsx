import {
  type Component,
  createSignal,
  createEffect,
} from "solid-js";
import { t } from "../i18n";
import Dialog from "./Dialog";
import { notificationStore } from "../store/notification-store";
import { HiOutlineClipboard } from "solid-icons/hi";

interface ExportCommandDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
}

type ExportType = "cli" | "curl" | "wget" | "rpc";

const ExportCommandDialog: Component<ExportCommandDialogProps> = (props) => {
  const [exportType, setExportType] = createSignal<ExportType>("cli");
  const [command, setCommand] = createSignal("");

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
      setCommand(cmd);
    } else if (type === "curl") {
      let cmd = `curl -L "${url}" -o "${fileName}"`;
      if (task.header && Array.isArray(task.header)) {
        task.header.forEach((h: string) => {
          cmd += ` -H "${h}"`;
        });
      }
      setCommand(cmd);
    } else if (type === "wget") {
      let cmd = `wget -c -O "${fileName}" "${url}"`;
      if (task.header && Array.isArray(task.header)) {
        task.header.forEach((h: string) => {
          cmd += ` --header="${h}"`;
        });
      }
      setCommand(cmd);
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
      setCommand(JSON.stringify(rpc, null, 2));
    }
  });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(command());
      notificationStore.add("Command copied to clipboard", "success");
    } catch (err) {
      notificationStore.add("Failed to copy command", "error");
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog
      title={t("task-detail.show-api")()}
      onClose={props.onClose}
    >
      <div class="p-4 space-y-4">
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
            class="textarea textarea-bordered w-full h-48 font-mono text-xs p-3 bg-base-200/60" 
            value={command()} 
            readonly 
          />
          <button 
            class="btn btn-primary btn-sm absolute bottom-3 right-3 gap-1.5 shadow-md" 
            onClick={copyToClipboard}
          >
            <HiOutlineClipboard class="w-4 h-4" />
            Copy
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default ExportCommandDialog;
