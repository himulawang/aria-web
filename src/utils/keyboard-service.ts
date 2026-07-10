export type KeyboardAction = 
  | "ADD_TASK" 
  | "OPEN_SETTINGS" 
  | "OPEN_STATUS" 
  | "REFRESH_TASKS" 
  | "SELECT_ALL" 
  | "FIND" 
  | "DELETE_TASK";

export const keyboardShortcuts: Record<string, KeyboardAction> = {
  "ctrl+n": "ADD_TASK",
  "ctrl+s": "OPEN_SETTINGS",
  "ctrl+i": "OPEN_STATUS",
  "ctrl+r": "REFRESH_TASKS",
  "ctrl+a": "SELECT_ALL",
  "ctrl+f": "FIND",
  "delete": "DELETE_TASK",
};

class KeyboardService {
  private isInitialized = false;
  private isMac = false;

  init() {
    if (this.isInitialized) return;
    
    const platform = window.navigator?.platform || "";
    this.isMac = /(Mac|iPhone|iPod|iPad)/i.test(platform);

    window.addEventListener("keydown", (event) => {
      // Ignore ALL global shortcuts when user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const key = event.key.toLowerCase();
      const modifierPressed = this.isMac ? event.metaKey : event.ctrlKey;
      const altPressed = event.altKey;
      const shiftPressed = event.shiftKey;

      let shortcut = "";
      if (modifierPressed) shortcut += "ctrl+";
      if (altPressed) shortcut += "alt+";
      if (shiftPressed) shortcut += "shift+";
      
      if (shortcut === "") {
          shortcut = key;
      } else {
          shortcut += key;
      }

      const action = keyboardShortcuts[shortcut];
      if (action) {
        event.preventDefault();
        this.handleAction(action);
      }
    }, true); // Use capture phase to intercept events early

    this.isInitialized = true;
    console.log(`[KeyboardService] Initialized global keyboard shortcuts (Mac: ${this.isMac}).`);
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
      case "SELECT_ALL":
        window.dispatchEvent(new CustomEvent("aria-web:select-all"));
        break;
      case "FIND":
        window.dispatchEvent(new CustomEvent("aria-web:find"));
        break;
      case "DELETE_TASK":
        window.dispatchEvent(new CustomEvent("aria-web:delete-task"));
        break;
    }
  }
}

export const keyboardService = new KeyboardService();
