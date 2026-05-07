const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

export const logger = {
    debug: (msg: string, context = "App") =>
        CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG &&
        console.debug(`[${context}] ${msg}`),
    info: (msg: string, context = "App") =>
        CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO &&
        console.info(`[${context}] ${msg}`),
    warn: (msg: string, context = "App") =>
        CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN &&
        console.warn(`[${context}] ${msg}`),
    error: (msg: string, context = "App") =>
        CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR &&
        console.error(`[${context}] ${msg}`),
};
