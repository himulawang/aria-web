import {
  type Component,
  createSignal,
} from "solid-js";
import { t } from "../i18n";
import Dialog from "./Dialog";

interface ExportCommandDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
}

const ExportCommandDialog: Component<ExportCommandDialogProps> = (props) => {
  const [command, setCommand] = createSignal("");

  const generateCommand = () => {
    if (!props.task) return;

    // 1. aria2c command line
    let cmd = `aria2c "${props.task.urls?.[0] || ""}"`;
    
    if (props.task.dir) cmd += ` --dir="${props.task.dir}"`;
    if (props.task.out) cmd += ` --out="${props.task.out}"`;
    if (props.task.split) cmd += ` --split=${props.task.split}`;
    
    // Other options can be added here
    
    setCommand(cmd);
  };

  const generateRPC = () => {
    const rpc = {
      method: "aria2.addUri",
      params: [
        "token:your_token",
        [[props.task.urls?.[0] || ""]],
        {
          dir: props.task.dir,
          out: props.task.out,
          split: props.task.split,
        }
      ]
    };
    setCommand(JSON.stringify(rpc, null, 2));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(command());
      // We could trigger a toast here if we had a global notification trigger
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Update command whenever task changes or dialog opens
  // Use createEffect or just call on open if simple
  
  return (
    <Dialog
      title={t("task-detail.show-api")()}
      onClose={props.onClose}
    >
      <div class="p-4 space-y-4">
        <div class="flex gap-2 mb-4">
          <button 
            class="btn btn-xs btn-outline" 
            onClick={generateCommand}
          >
            aria2c CLI
          </button>
          <button 
            class="btn btn-xs btn-outline" 
            onClick={generateRPC}
          >
            JSON-RPC
          </button>
        </div>
        
        <div class="relative">
          <textarea 
            class="textarea textarea-bordered w-full h-48 font-mono text-xs" 
            value={command()} 
            readonly 
          />
          <button 
            class="btn btn-primary btn-sm absolute bottom-2 right-2" 
            onClick={copyToClipboard}
          >
            Copy
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default ExportCommandDialog;
