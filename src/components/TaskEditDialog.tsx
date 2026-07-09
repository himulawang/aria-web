import {
  type Component,
  Show,
  createSignal,
} from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { Dialog } from "./Dialog";

const TaskEditDialog: Component<{ gid: string; initialOptions: any }> = (props) => {
  const [dir, setDir] = createSignal(props.initialOptions?.dir || "");
  const [out, setOut] = createSignal(props.initialOptions?.out || "");
  const [split, setSplit] = createSignal(props.initialOptions?.split || "1");

  const handleSave = async () => {
    const options = {
      dir,
      out,
      split,
    };
    // Filter out empty values
    const filteredOptions: Record<string, any> = {};
    for (const [key, value] of Object.entries(options)) {
      if (value() !== "") {
        filteredOptions[key] = value();
      }
    }

    try {
      await aria2Store.changeTaskOption(props.gid, filteredOptions);
      aria2Store.setSelectedTask(null); // Close dialog
    } catch (e) {
      console.error("Failed to save task options:", e);
    }
  };

  return (
    <Dialog
      title={t("task-detail.edit")()}
      onClose={() => aria2Store.setSelectedTask(null)}
    >
      <div class="space-y-4 p-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">{t("task-detail.directory")()}</span>
          </label>
          <input
            type="text"
            class="input input-bordered"
            value={dir()}
            onInput={(e) => setDir(e.currentTarget.value)}
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">{t("task-detail.out")()}</span>
          </label>
          <input
            type="text"
            class="input input-bordered"
            value={out()}
            onInput={(e) => setOut(e.currentTarget.value)}
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">{t("task-detail.split")()}</span>
          </label>
          <input
            type="number"
            class="input input-bordered"
            value={split()}
            onInput={(e) => setSplit(e.currentTarget.value)}
          />
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <button
            class="btn btn-ghost"
            onClick={() => aria2Store.setSelectedTask(null)}
          >
            {t("common.cancel")()}
          </button>
          <button class="btn btn-primary" onClick={handleSave}>
            {t("common.save")()}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default TaskEditDialog;
