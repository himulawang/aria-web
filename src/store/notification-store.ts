import { createStore } from "solid-js/store";
import { StorageService } from "../core/storage";

export interface Notification {
    id: number;
    title?: string;
    message: string;
    type: "success" | "error" | "info";
}

const [notifications, setNotifications] = createStore<Notification[]>([]);

// Browser Notification State
const NOTIF_HISTORY_KEY = "aria2_browser_notif_history";

export const notificationStore = {
    notifications,
    
    // In-Page Toast
    add(message: string, type: Notification["type"] = "info", title?: string) {
        const id = Date.now();
        setNotifications([...notifications, { id, message, type, title }]);
        setTimeout(() => this.remove(id), 5000);
    },
    
    remove(id: number) {
        setNotifications(notifications.filter((n) => n.id !== id));
    },

    // Browser Notification System (Migrated from AriaNg)
    async requestBrowserPermission(): Promise<boolean> {
        if (!("Notification" in window)) return false;
        const permission = await Notification.requestPermission();
        return permission === "granted";
    },

    async notifyViaBrowser(title: string, message: string) {
        if (!("Notification" in window) || Notification.permission !== "granted") {
            return;
        }

        // Frequency Limit Logic (Simplified migration from AriaNg)
        const history = StorageService.get<number[]>(NOTIF_HISTORY_KEY) || [];
        const now = Date.now();
        
        // Limit: max 5 notifications per minute
        const oneMinuteAgo = now - 60000;
        const recentNotifs = history.filter(t => t > oneMinuteAgo);
        
        if (recentNotifs.length >= 5) {
            console.warn("[NotificationStore] Browser notification frequency limit reached");
            return;
        }

        new Notification(title, { body: message, icon: "/favicon.svg" });
        
        // Record history
        StorageService.set(NOTIF_HISTORY_KEY, [...recentNotifs, now]);
    }
};
