const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

import { debugStore } from "../store/debug-store";

export const logger = {
    debug: (msg: string, context = "App") => {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
            console.debug(`[${context}] ${msg}`);
        }
        debugStore.addLog("DEBUG", `[${context}] ${msg}`);
    },
    info: (msg: string, context = "App") => {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
            console.info(`[${context}] ${msg}`);
        }
        debugStore.addLog("INFO", `[${context}] ${msg}`);
    },
    warn: (msg: string, context = "App") => {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
            console.warn(`[${context}] ${msg}`);
        }
        debugStore.addLog("WARN", `[${context}] ${msg}`);
    },
    error: (msg: string, context = "App") => {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
            console.error(`[${context}] ${msg}`);
        }
        debugStore.addLog("ERROR", `[${context}] ${msg}`);
    },
};
