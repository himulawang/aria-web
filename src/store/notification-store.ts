import { createStore } from "solid-js/store";

export interface Notification {
    id: number;
    message: string;
    type: "success" | "error" | "info";
}

const [notifications, setNotifications] = createStore<Notification[]>([]);

export const notificationStore = {
    notifications,
    add(message: string, type: Notification["type"] = "info") {
        const id = Date.now();
        setNotifications([...notifications, { id, message, type }]);
        setTimeout(() => this.remove(id), 5000);
    },
    remove(id: number) {
        setNotifications(notifications.filter((n) => n.id !== id));
    },
};
