import { type Component, Show, createSignal } from "solid-js";
import { aria2Store } from "../store";
import { formatSize, formatSpeed } from "../utils/format";
import "./styles/task-detail.css";

const TaskDetail: Component = () => {
    const state = aria2Store.getState();
    const [isActionLoading, setIsActionLoading] = createSignal(false);

    const handleAction = async (action: "pause" | "resume") => {
        setIsActionLoading(true);
        const task = state.selectedTaskDetail;
        if (task) {
            if (action === "pause") await aria2Store.pauseTask(task.gid);
            else await aria2Store.resumeTask(task.gid);
        }
        setIsActionLoading(false);
    };

    const handleSpeedChange = async (type: "down" | "up", value: string) => {
        const task = state.selectedTaskDetail;
        if (!task) return;
        const limit = parseInt(value) * 1024; // Convert KB to bytes
        if (isNaN(limit)) return;

        if (type === "down") {
            await aria2Store.limitDownloadSpeed(task.gid, limit);
        } else {
            await aria2Store.limitUploadSpeed(task.gid, limit);
        }
    };

    return (
        <Show
            when={state.selectedTaskDetail}
            fallback={
                <div class="task-detail-empty">
                    Select a task to see details
                </div>
            }
        >
            <div class="task-detail-container">
                <div class="task-detail-header">
                    <h2 class="task-detail-header-title">Task Details</h2>
                    <span
                        class="task-detail-status-badge"
                        style={{
                            "background-color":
                                state.selectedTaskDetail?.status === "active"
                                    ? "#e3f2fd"
                                    : "#eee",
                            color:
                                state.selectedTaskDetail?.status === "active"
                                    ? "#2196f3"
                                    : "#666",
                        }}
                    >
                        {state.selectedTaskDetail?.status.toUpperCase()}
                    </span>
                </div>

                <div class="task-detail-grid">
                    <span class="task-detail-grid-label">GID:</span>
                    <span class="task-detail-grid-value-mono">
                        {state.selectedTaskDetail?.gid}
                    </span>

                    <span class="task-detail-grid-label">Progress:</span>
                    <div class="task-detail-progress-wrapper">
                        <div class="task-detail-progress-bg">
                            <div
                                class="task-detail-progress-fill"
                                style={{
                                    width: `${Math.min(100, Math.round((state.selectedTaskDetail!.completedLength / (state.selectedTaskDetail!.totalLength || 1)) * 100))}%`,
                                    "background-color": "#2196f3",
                                }}
                            />
                        </div>
                        <span>
                            {Math.round(
                                (state.selectedTaskDetail!.completedLength /
                                    (state.selectedTaskDetail!.totalLength ||
                                        1)) *
                                    100,
                            )}
                            %
                        </span>
                    </div>

                    <span class="task-detail-grid-label">Total Size:</span>
                    <span>
                        {formatSize(
                            Number(state.selectedTaskDetail!.totalLength),
                        )}
                    </span>

                    <span class="task-detail-grid-label">Download Speed:</span>
                    <span>
                        {formatSpeed(
                            Number(state.selectedTaskDetail!.downloadSpeed),
                        )}
                    </span>

                    <span class="task-detail-grid-label">Upload Speed:</span>
                    <span>
                        {formatSpeed(
                            Number(state.selectedTaskDetail!.uploadSpeed),
                        )}
                    </span>
                </div>

                <div class="task-detail-speed-limits-card">
                    <h4 class="task-detail-speed-limits-title">
                        Speed Limits (KB/s)
                    </h4>
                    <div class="task-detail-speed-limits-row">
                        <div class="task-detail-speed-limit-group">
                            <label class="task-detail-speed-limit-label">
                                Download Limit
                            </label>
                            <input
                                type="number"
                                placeholder="0 = Unlimited"
                                onBlur={(e) =>
                                    handleSpeedChange(
                                        "down",
                                        e.currentTarget.value,
                                    )
                                }
                                class="task-detail-speed-limit-input"
                            />
                        </div>
                        <div class="task-detail-speed-limit-group">
                            <label class="task-detail-speed-limit-label">
                                Upload Limit
                            </label>
                            <input
                                type="number"
                                placeholder="0 = Unlimited"
                                onBlur={(e) =>
                                    handleSpeedChange(
                                        "up",
                                        e.currentTarget.value,
                                    )
                                }
                                class="task-detail-speed-limit-input"
                            />
                        </div>
                    </div>
                </div>

                <div class="task-detail-files-container">
                    <h4 class="task-detail-files-title">Files</h4>
                    <div class="task-detail-files-list">
                        {state.selectedTaskDetail?.files?.map((file: any) => (
                            <div class="task-detail-file-item">
                                <span class="task-detail-file-name">
                                    {file.path.split("/").pop()}
                                </span>
                                <span class="task-detail-file-size">
                                    {formatSize(Number(file.length))}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div class="task-detail-actions">
                    <button
                        onClick={() =>
                            handleAction(
                                state.selectedTaskDetail?.status === "active"
                                    ? "pause"
                                    : "resume",
                            )
                        }
                        disabled={isActionLoading()}
                        class="task-detail-btn-primary"
                        style={{
                            "background-color":
                                state.selectedTaskDetail?.status === "active"
                                    ? "#ff9800"
                                    : "#4caf50",
                        }}
                    >
                        {isActionLoading()
                            ? "Processing..."
                            : state.selectedTaskDetail?.status === "active"
                              ? "Pause"
                              : "Resume"}
                    </button>
                    <button
                        onClick={() =>
                            aria2Store.removeTask(state.selectedTaskDetail!.gid)
                        }
                        class="task-detail-btn-danger"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </Show>
    );
};

export default TaskDetail;
