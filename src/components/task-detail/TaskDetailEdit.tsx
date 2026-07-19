import { type Component, createSignal, createEffect, Show } from "solid-js";
import { aria2Store } from "../../store";
import { notificationStore } from "../../store/notification-store";
import { t } from "../../i18n";
import { HiOutlineArrowLeft, HiOutlineCheck } from "solid-icons/hi";

interface TaskDetailEditProps {
  task: any;
  onCancel: () => void;
  onSaveSuccess: () => void;
}

export const TaskDetailEdit: Component<TaskDetailEditProps> = (props) => {
  const [editDir, setEditDir] = createSignal("");
  const [editOut, setEditOut] = createSignal("");
  const [editSplit, setEditSplit] = createSignal("1");
  const [isSavingOptions, setIsSavingOptions] = createSignal(false);

  // Fetch active options when entering "edit" mode
  createEffect(async () => {
    const gid = props.task?.gid;
    if (gid) {
      try {
        const [dirVal, outVal, splitVal] = await Promise.allSettled([
          aria2Store.getTaskOption(gid, "dir"),
          aria2Store.getTaskOption(gid, "out"),
          aria2Store.getTaskOption(gid, "split")
        ]);

        setEditDir(dirVal.status === "fulfilled" ? String(dirVal.value) : (props.task?.dir || ""));
        setEditOut(outVal.status === "fulfilled" ? String(outVal.value) : (props.task?.out || ""));
        setEditSplit(splitVal.status === "fulfilled" ? String(splitVal.value) : (props.task?.split || "1"));
      } catch (e) {
        console.error("Failed to load options from server", e);
        setEditDir(props.task?.dir || "");
        setEditOut(props.task?.out || "");
        setEditSplit(props.task?.split || "1");
      }
    }
  });

  const handleSaveOptions = async () => {
    const gid = props.task?.gid;
    if (!gid) return;

    setIsSavingOptions(true);
    const options = {
      dir: editDir().trim(),
      out: editOut().trim(),
      split: editSplit().trim(),
    };

    const filteredOptions: Record<string, any> = {};
    for (const [key, value] of Object.entries(options)) {
      if (value !== "") {
        filteredOptions[key] = value;
      }
    }

    try {
      await aria2Store.changeTaskOption(gid, filteredOptions);
      notificationStore.add("Task options saved successfully", "success");
      await aria2Store.fetchTaskDetail(gid);
      props.onSaveSuccess();
    } catch (err) {
      notificationStore.add(`Failed to save task options: ${err}`, "error");
    } finally {
      setIsSavingOptions(false);
    }
  };

  return (
    <>
      <div class="flex items-center gap-3">
        <button 
          onClick={props.onCancel} 
          class="btn btn-sm btn-ghost btn-circle"
          disabled={isSavingOptions()}
        >
          <HiOutlineArrowLeft class="w-5 h-5" />
        </button>
        <h2 class="text-lg font-bold">{t("task-detail.edit")()}</h2>
      </div>

      <div class="space-y-4 py-1">
        <div class="form-control w-full">
          <label class="label pt-0">
            <span class="label-text font-semibold text-xs opacity-75">{t("task-detail.directory")()}</span>
          </label>
          <input
            type="text"
            class="input input-sm input-bordered w-full font-mono text-xs"
            value={editDir()}
            onInput={(e) => setEditDir(e.currentTarget.value)}
            disabled={isSavingOptions()}
          />
        </div>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text font-semibold text-xs opacity-75">{t("task-detail.out")()}</span>
          </label>
          <input
            type="text"
            class="input input-sm input-bordered w-full font-mono text-xs"
            value={editOut()}
            onInput={(e) => setEditOut(e.currentTarget.value)}
            disabled={isSavingOptions()}
          />
        </div>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text font-semibold text-xs opacity-75">{t("task-detail.split")()}</span>
          </label>
          <input
            type="number"
            class="input input-sm input-bordered w-full font-mono text-xs"
            value={editSplit()}
            onInput={(e) => setEditSplit(e.currentTarget.value)}
            disabled={isSavingOptions()}
          />
        </div>

        <div class="flex gap-2 pt-4">
          <button
            class="btn btn-sm btn-ghost flex-1"
            onClick={props.onCancel}
            disabled={isSavingOptions()}
          >
            Cancel
          </button>
          <button
            class="btn btn-sm btn-primary flex-1 gap-1.5"
            onClick={handleSaveOptions}
            disabled={isSavingOptions()}
          >
            <Show when={isSavingOptions()} fallback={<HiOutlineCheck class="w-4 h-4" />}>
              <span class="loading loading-spinner loading-xs"></span>
            </Show>
            Save Options
          </button>
        </div>
      </div>
    </>
  );
};
