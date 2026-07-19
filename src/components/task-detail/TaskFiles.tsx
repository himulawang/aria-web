import { type Component, For, Show } from "solid-js";
import { HiOutlineCommandLine } from "solid-icons/hi";
import { formatSize } from "../../utils/format";

interface TaskFilesProps {
  files?: any[];
  isBittorrent?: boolean;
  selectedIndices: Set<number>;
  onToggleSelection: (index: number) => void;
  onManageLinks: (index: number) => void;
}

export const TaskFiles: Component<TaskFilesProps> = (props) => {
  return (
    <div class="space-y-3">
      <span class="text-xs font-semibold opacity-70 block mb-1">
        Select Files to Download:
      </span>
      <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        <For each={props.files}>
          {(file, index) => (
            <div 
              class={`p-3 rounded-xl text-xs space-y-1.5 cursor-pointer border transition-all duration-200 ${
                props.selectedIndices.has(index()) 
                  ? 'bg-primary/5 border-primary/30 shadow-sm' 
                  : 'bg-base-200/50 border-base-300/40 hover:bg-base-200'
              }`}
              onClick={() => props.onToggleSelection(index())}
            >
              <div class="flex items-start gap-2.5">
                <input 
                  type="checkbox" 
                  checked={props.selectedIndices.has(index())} 
                  onChange={() => {}} 
                  class="checkbox checkbox-primary checkbox-xs mt-0.5"
                />
                <div class="font-bold flex-1 break-all text-[11px] leading-tight">
                  {file.path.split("/").pop()}
                </div>
                <Show when={!props.isBittorrent}>
                  <button
                    class="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10 px-2 min-h-0 h-6 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onManageLinks(index());
                    }}
                  >
                    <HiOutlineCommandLine class="w-3.5 h-3.5" />
                    Links
                  </button>
                </Show>
              </div>
              <div class="text-[10px] opacity-60 pl-6 flex justify-between font-mono">
                <span>Size: {formatSize(Number(file.length))}</span>
                <span>Progress: {Math.round(Number(file.completedLength) / (Number(file.length) || 1) * 100)}%</span>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
