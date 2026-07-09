import { type Component, Show} from "solid-js";
import { dialogStore } from "../store/dialog-store";

const Dialog: Component = () => {
    const { dialog } = dialogStore;

    const getAlertClass = () => {
        switch (dialog.type) {
            case "success": return "alert-success";
            case "error": return "alert-error";
            case "warning": return "alert-warning";
            default: return "alert-info";
        }
    };

    return (
        <Show when={dialog.isOpen}>
            <div class="modal modal-open">
                <div class="modal-box">
                    <h3 class="font-bold text-lg mb-2">{dialog.title}</h3>
                    <p class="py-4">{dialog.message}</p>
                    <div class="modal-action">
                        <Show when={dialog.isConfirmDialog}>
                            <button 
                                class="btn btn-ghost" 
                                onClick={() => dialogStore.handleCancel()}
                            >
                                {dialog.cancelText || "Cancel"}
                            </button>
                        </Show>
                        <button 
                            class={`btn ${dialog.type === 'error' ? 'btn-error' : 'btn-primary'}`} 
                            onClick={() => dialogStore.handleConfirm()}
                        >
                            {dialog.confirmText || "OK"}
                        </button>
                    </div>
                </div>
                <div class="modal-backdrop" onClick={() => dialogStore.close()}></div>
            </div>
        </Show>
    );
};

export default Dialog;
