const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

import { debugStore } from "../store/debug-store";

export const logger = {
    debug: (msg: string | (() => string), context = "App") => {
        const isConsole = CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG;
        const isStore = debugStore.getState().enableDebugLog;
        if (!isConsole && !isStore) return;

        const val = typeof msg === "function" ? msg() : msg;
        const formatted = `[${context}] ${val}`;
        if (isConsole) console.debug(formatted);
        if (isStore) debugStore.addLog("DEBUG", context, val);
    },
    info: (msg: string | (() => string), context = "App") => {
        const isConsole = CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO;
        const isStore = debugStore.getState().enableDebugLog;
        if (!isConsole && !isStore) return;

        const val = typeof msg === "function" ? msg() : msg;
        const formatted = `[${context}] ${val}`;
        if (isConsole) console.info(formatted);
        if (isStore) debugStore.addLog("INFO", context, val);
    },
    warn: (msg: string | (() => string), context = "App") => {
        const isConsole = CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN;
        const isStore = debugStore.getState().enableDebugLog;
        if (!isConsole && !isStore) return;

        const val = typeof msg === "function" ? msg() : msg;
        const formatted = `[${context}] ${val}`;
        if (isConsole) console.warn(formatted);
        if (isStore) debugStore.addLog("WARN", context, val);
    },
    error: (msg: string | (() => string), context = "App") => {
        const isConsole = CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR;
        const isStore = debugStore.getState().enableDebugLog;
        if (!isConsole && !isStore) return;

        const val = typeof msg === "function" ? msg() : msg;
        const formatted = `[${context}] ${val}`;
        if (isConsole) console.error(formatted);
        if (isStore) debugStore.addLog("ERROR", context, val);
    },
};
