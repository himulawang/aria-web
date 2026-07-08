import { createStore } from "solid-js/store";

export interface DialogState {
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "error" | "success" | "warning";
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    isConfirmDialog: boolean;
}

const [dialog, setDialog] = createStore<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: () => {},
    onCancel: () => {},
    isConfirmDialog: false,
});

export const dialogStore = {
    dialog,
    
    show(title: string, message: string, type: DialogState["type"] = "info", options: Partial<DialogState> = {}) {
        setDialog({
            isOpen: true,
            title,
            message,
            type,
            confirmText: options.confirmText || "OK",
            cancelText: options.cancelText || "Cancel",
            onConfirm: options.onConfirm,
            onCancel: options.onCancel,
            isConfirmDialog: options.isConfirmDialog || false,
        });
    },

    showError(message: string, onConfirm?: () => void) {
        this.show("Error", message, "error", { onConfirm });
    },

    showSuccess(message: string, onConfirm?: () => void) {
        this.show("Success", message, "success", { onConfirm });
    },

    showInfo(message: string, onConfirm?: () => void) {
        this.show("Info", message, "info", { onConfirm });
    },

    confirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void) {
        this.show(title, message, "warning", {
            isConfirmDialog: true,
            onConfirm,
            onCancel,
        });
    },

    close() {
        setDialog({ ...dialog, isOpen: false });
    },

    handleConfirm() {
        if (dialog.onConfirm) dialog.onConfirm();
        this.close();
    },

    handleCancel() {
        if (dialog.onCancel) dialog.onCancel();
        this.close();
    },
};
