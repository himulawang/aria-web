import { type Component, createSignal, For, Show } from "solid-js";
import { aria2Store } from "../../store";
import { notificationStore } from "../../store/notification-store";
import { HiOutlineArrowLeft, HiOutlineCheck } from "solid-icons/hi";

interface TaskDetailLinksProps {
  task: any;
  fileIndex: number;
  onCancel: () => void;
  onSaveSuccess: () => void;
}

export const TaskDetailLinks: Component<TaskDetailLinksProps> = (props) => {
  const [newUrisInput, setNewUrisInput] = createSignal("");
  const [urisToDelete, setUrisToDelete] = createSignal<Set<string>>(new Set());
  const [isSavingUris, setIsSavingUris] = createSignal(false);

  const handleToggleUriDelete = (uri: string) => {
    const next = new Set<string>(urisToDelete());
    if (next.has(uri)) {
      next.delete(uri);
    } else {
      next.add(uri);
    }
    setUrisToDelete(next);
  };

  const handleSaveUris = async () => {
    const gid = props.task?.gid;
    if (!gid) return;

    const delUris = Array.from(urisToDelete());
    const addUris = newUrisInput()
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    setIsSavingUris(true);
    try {
      await aria2Store.changeUri(gid, props.fileIndex + 1, delUris, addUris);
      notificationStore.add("URIs updated successfully", "success");
      await aria2Store.fetchTaskDetail(gid);
      props.onSaveSuccess();
    } catch (err) {
      notificationStore.add(`Failed to update URIs: ${err}`, "error");
    } finally {
      setIsSavingUris(false);
      setNewUrisInput("");
      setUrisToDelete(new Set<string>());
    }
  };

  return (
    <>
      <div class="flex items-center gap-3">
        <button 
          onClick={props.onCancel} 
          class="btn btn-sm btn-ghost btn-circle"
          disabled={isSavingUris()}
        >
          <HiOutlineArrowLeft class="w-5 h-5" />
        </button>
        <h2 class="text-lg font-bold">Manage Links</h2>
      </div>

      <div class="space-y-4 py-1">
        <div class="p-3 bg-base-200/40 border border-base-300/40 rounded-xl text-xs space-y-1">
          <span class="opacity-60 block font-bold text-[9px]">FILE NAME:</span>
          <span class="break-all font-semibold text-primary leading-tight block">
            {props.task?.files?.[props.fileIndex]?.path?.split("/").pop()}
          </span>
        </div>

        <div class="space-y-2">
          <span class="text-xs font-semibold opacity-70 block">Current Mirrors:</span>
          <div class="max-h-48 overflow-y-auto space-y-2 border border-base-300/50 p-2 rounded-xl bg-base-200/30">
            <For 
              each={props.task?.files?.[props.fileIndex]?.uris}
              fallback={
                <div class="text-center py-6 opacity-50 text-[10px]">No mirrors available.</div>
              }
            >
              {(u) => (
                <div class="flex items-center justify-between gap-3 p-2 bg-base-100 rounded-lg border border-base-200 text-xs">
                  <span 
                    class={`break-all flex-1 font-mono text-[9px] select-all leading-relaxed ${
                      urisToDelete().has(u.uri) ? "line-through text-error opacity-60" : ""
                    }`}
                  >
                    {u.uri}
                  </span>
                  <div class="flex items-center gap-2">
                    <span class={`badge badge-xs text-[8px] py-1 font-bold ${u.status === "used" ? "badge-success text-success-content" : "badge-ghost opacity-60"}`}>
                      {u.status}
                    </span>
                    <button
                      type="button"
                      class={`btn btn-[10px] min-h-0 h-6 px-2.5 ${
                        urisToDelete().has(u.uri) ? "btn-warning text-warning-content font-bold" : "btn-error btn-outline hover:bg-error"
                      }`}
                      onClick={() => handleToggleUriDelete(u.uri)}
                      disabled={isSavingUris()}
                    >
                      {urisToDelete().has(u.uri) ? "Undo" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <div class="form-control">
          <label class="label pt-0">
            <span class="label-text font-semibold text-xs opacity-75">Add New Mirror URLs (One per line):</span>
          </label>
          <textarea
            class="textarea textarea-bordered h-20 font-mono text-xs placeholder:opacity-50"
            placeholder="http://example.com/file.zip&#10;https://another.mirror/file.zip"
            value={newUrisInput()}
            onInput={(e) => setNewUrisInput(e.currentTarget.value)}
            disabled={isSavingUris()}
          />
        </div>

        <div class="flex gap-2 pt-2">
          <button
            class="btn btn-sm btn-ghost flex-1"
            onClick={props.onCancel}
            disabled={isSavingUris()}
          >
            Cancel
          </button>
          <button
            class="btn btn-sm btn-primary flex-1 gap-1.5"
            onClick={handleSaveUris}
            disabled={isSavingUris() || (urisToDelete().size === 0 && !newUrisInput().trim())}
          >
            <Show when={isSavingUris()} fallback={<HiOutlineCheck class="w-4 h-4" />}>
              <span class="loading loading-spinner loading-xs"></span>
            </Show>
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
};
