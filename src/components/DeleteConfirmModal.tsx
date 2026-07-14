import { type Component, Show } from "solid-js";
import { Portal } from "solid-js/web";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  tasksCount: number;
  forceDeleteChecked: boolean;
  setForceDeleteChecked: (checked: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: Component<DeleteConfirmModalProps> = (props) => {
  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class="modal modal-open z-50">
          <div class="modal-box w-11/12 max-w-md">
            <h3 class="font-bold text-lg text-error mb-4">Confirm Delete</h3>
            <p class="text-sm opacity-90">
              Are you sure you want to delete {props.tasksCount} selected task(s)?
            </p>
            
            <div class="form-control mt-4">
              <label class="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  class="checkbox checkbox-error checkbox-sm"
                  checked={props.forceDeleteChecked}
                  onChange={(e) => props.setForceDeleteChecked(e.currentTarget.checked)}
                />
                <span class="label-text text-sm">Force delete immediately (skip tracker handshake)</span>
              </label>
            </div>

            <div class="modal-action">
              <button
                class="btn btn-sm btn-ghost"
                onClick={props.onCancel}
              >
                Cancel
              </button>
              <button
                class="btn btn-sm btn-error"
                onClick={props.onConfirm}
              >
                Confirm Delete
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop bg-black/40"
            onClick={props.onCancel}
          ></div>
        </div>
      </Portal>
    </Show>
  );
};

export default DeleteConfirmModal;
