import { type Component, Show, type JSX } from "solid-js";
import { dialogStore } from "../store/dialog-store";

interface DialogProps {
    title?: string;
    children?: JSX.Element;
    onClose?: () => void;
}

const Dialog: Component<DialogProps> = (props) => {
    const dialog = dialogStore.dialog;

    // If we have children, we use the props. Otherwise, we use the global store.
    const isOpen = props.children ? true : dialog.isOpen;
    const title = props.title || dialog.title;
    const onClose = props.onClose || (() => dialogStore.close());
    const message = dialog.message;

    return (
        <Show when={isOpen}>
            <div class="modal modal-open">
                <div class="modal-box">
                    <h3 class="font-bold text-lg mb-2">{title}</h3>
                    {message && <p class="py-4">{message}</p>}
                    {props.children}
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
                            onClick={onClose}
                        >
                            {props.children ? (props.onClose ? "Close" : "OK") : (dialog.confirmText || "OK")}
                        </button>
                    </div>
                </div>
                <div class="modal-backdrop" onClick={onClose}></div>
            </div>
        </Show>
    );
};

export default Dialog;
