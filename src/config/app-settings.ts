export interface AppSettings {
    language: string;
    theme: "light" | "dark" | "system";
    debugMode: boolean;
    browserNotification: boolean;
    browserNotificationSound: boolean;
    browserNotificationFrequency: "high" | "middle" | "low" | "unlimited";
    webSocketReconnectInterval: number;
    titleRefreshInterval: number;
    globalStatRefreshInterval: number;
    downloadTaskRefreshInterval: number;
    keyboardShortcuts: boolean;
    swipeGesture: boolean;
    dragAndDropTasks: boolean;
    rpcListDisplayOrder: string;
    afterCreatingNewTask: string;
    removeOldTaskAfterRetrying: boolean;
    confirmTaskRemoval: boolean;
    includePrefixWhenCopyingFromTaskDetails: boolean;
    showPiecesInfoInTaskDetailPage: boolean;
    afterRetryingTask: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
    language: "en",
    theme: "system",
    debugMode: false,
    browserNotification: false,
    browserNotificationSound: true,
    browserNotificationFrequency: "middle",
    webSocketReconnectInterval: 5000,
    titleRefreshInterval: 60,
    globalStatRefreshInterval: 30,
    downloadTaskRefreshInterval: 10,
    keyboardShortcuts: true,
    swipeGesture: false,
    dragAndDropTasks: true,
    rpcListDisplayOrder: "default",
    afterCreatingNewTask: "none",
    removeOldTaskAfterRetrying: false,
    confirmTaskRemoval: true,
    includePrefixWhenCopyingFromTaskDetails: true,
    showPiecesInfoInTaskDetailPage: true,
    afterRetryingTask: "none",
};
