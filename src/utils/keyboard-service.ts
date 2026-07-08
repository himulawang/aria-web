import { notificationStore } from "../store/notification-store";

export type KeyboardAction = "ADD_TASK" | "OPEN_SETTINGS" | "OPEN_STATUS" | "REFRESH_TASKS";

export const keyboardShortcuts: Record<string, KeyboardAction> = {
  "ctrl+n": "ADD_TASK",
  "ctrl+s": "OPEN_SETTINGS",
  "ctrl+i": "OPEN_STATUS",
  "ctrl+r": "REFRESH_TASKS",
};

class KeyboardService {
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;
    
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      const ctrlPressed = event.ctrlKey || event.metaKey;
      const altPressed = event.altKey;
      const shiftPressed = event.shiftKey;

      let shortcut = "";
      if (ctrlPressed) shortcut += "ctrl+";
      if (altPressed) shortcut += "alt+";
      if (shiftPressed) shortcut += "shift+";
      shortcut += key;

      const action = keyboardShortcuts[shortcut];
      if (action) {
        event.preventDefault();
        this.handleAction(action);
      }
    });

    this.isInitialized = true;
    console.log("[KeyboardService] Initialized global keyboard shortcuts.");
  }

  private handleAction(action: KeyboardAction) {
    console.log(`[KeyboardService] Triggering action: ${action}`);
    
    switch (action) {
      case "ADD_TASK":
        window.dispatchEvent(new CustomEvent("aria-web:add-task"));
        break;
      case "OPEN_SETTINGS":
        window.dispatchEvent(new CustomEvent("aria-web:open-settings"));
        break;
      case "OPEN_STATUS":
        window.dispatchEvent(new CustomEvent("aria-web:open-status"));
        break;
      case "REFRESH_TASKS":
        window.dispatchEvent(new CustomEvent("aria-web:refresh-tasks"));
        break;
    }
  }
}

export const keyboardService = new KeyboardService();
