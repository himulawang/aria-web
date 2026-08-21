import { type Component, For, Show, createMemo } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { matchTaskRule } from "../utils/scheduler-engine";
import {
  HiOutlineSparkles,
  HiOutlineArrowPath,
  HiOutlineArrowPathRoundedSquare,
  HiOutlineCog6Tooth,
} from "solid-icons/hi";

interface SchedulerLiveDistributionProps {
  compact?: boolean;
  showActions?: boolean;
}

export const SchedulerLiveDistribution: Component<SchedulerLiveDistributionProps> = (props) => {
  const state = aria2Store.getState();
  const config = () => state.schedulerConfig;

  const stats = createMemo(() => {
    const activeTasks = state.tasks.filter((t) => t.status === "active");
    const waitingTasks = state.tasks.filter((t) => t.status === "waiting" || t.status === "paused");

    const counts: Record<string, { name: string; color: string; active: number; waiting: number }> = {};

    const recordTask = (task: any, isActive: boolean) => {
      const rule = matchTaskRule(task, config().rules || []);
      const key = rule ? rule.id : "__other__";
      const name = rule ? rule.name : (t("scheduler.otherUnmatched")() || "其他/未匹配");
      const color = rule ? (rule.badgeColor || "#64748b") : "#94a3b8";

      if (!counts[key]) {
        counts[key] = { name, color, active: 0, waiting: 0 };
      }
      if (isActive) {
        counts[key].active++;
      } else {
        counts[key].waiting++;
      }
    };

    activeTasks.forEach((t) => recordTask(t, true));
    waitingTasks.forEach((t) => recordTask(t, false));

    return Object.values(counts);
  });

  const handleTriggerBalance = async () => {
    await aria2Store.triggerSmartBalance();
  };

  const handleInterleaveQueue = async () => {
    await aria2Store.manualInterleaveQueue();
  };

  const hasTasks = () => stats().length > 0;

  // In compact mode (for TaskList header), if there are no active/waiting tasks and scheduler is not enabled, keep it minimal or hide
  return (
    <div
      class={`card bg-base-100/90 backdrop-blur-sm shadow-sm border border-base-300 transition-all ${
        props.compact ? "p-2.5 sm:p-3" : "p-4 sm:p-5"
      }`}
    >
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        {/* Title & Status */}
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-base-content/90">
            <HiOutlineSparkles class="w-4 h-4 text-primary shrink-0" />
            <span>{t("scheduler.liveStatus")() || "实时并发与队列分布"}</span>
          </div>

          <span
            class={`badge badge-xs sm:badge-sm font-medium ${
              config().enabled
                ? "badge-success text-success-content"
                : "badge-ghost text-base-content/60"
            }`}
          >
            {config().enabled
              ? (t("scheduler.statusEnabled")() || "智能调度已启用")
              : (t("scheduler.statusDisabled")() || "智能调度已停用")}
          </span>
        </div>

        {/* Quick action buttons if requested */}
        <Show when={props.showActions}>
          <div class="flex items-center gap-1.5 ml-auto">
            <button
              class="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-primary"
              onClick={handleInterleaveQueue}
              title={t("scheduler.tooltipInterleave")() || "将等待队列按来源交替重排"}
            >
              <HiOutlineArrowPathRoundedSquare class="w-3.5 h-3.5" />
              <span class="hidden sm:inline text-xs">{t("scheduler.interleaveNow")() || "交错队列"}</span>
            </button>
            <button
              class="btn btn-xs btn-ghost gap-1 text-primary hover:bg-primary/10"
              onClick={handleTriggerBalance}
              title={t("scheduler.tooltipBalance")() || "立即检查并执行多源线程均衡"}
            >
              <HiOutlineArrowPath class="w-3.5 h-3.5" />
              <span class="hidden sm:inline text-xs">{t("scheduler.balanceNow")() || "均衡线程"}</span>
            </button>
            <a
              href="#/scheduler"
              class="btn btn-xs btn-ghost btn-square text-base-content/60 hover:text-primary"
              title={t("scheduler.openSettings")() || "配置调度规则"}
            >
              <HiOutlineCog6Tooth class="w-3.5 h-3.5" />
            </a>
          </div>
        </Show>
      </div>

      {/* Distribution Badges */}
      <div class={`flex flex-wrap gap-2 ${props.compact ? "mt-2" : "mt-3"}`}>
        <Show
          when={hasTasks()}
          fallback={
            <div class="text-xs text-base-content/50 italic py-0.5">
              {t("scheduler.noActiveWaitingTasks")() || "当前暂无活跃或排队任务"}
            </div>
          }
        >
          <For each={stats()}>
            {(item) => (
              <div class="flex items-center gap-1.5 bg-base-200/70 hover:bg-base-200 px-2.5 py-1 rounded-md border border-base-300/80 text-xs shadow-xs transition-colors">
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ "background-color": item.color }}
                />
                <span class="font-medium text-base-content/90">{item.name}</span>
                <span class="badge badge-xs badge-primary font-mono ml-0.5" title={t("scheduler.activeLabel")()}>
                  {t("scheduler.activeLabel")() || "活跃"}: {item.active}
                </span>
                <span class="badge badge-xs badge-ghost font-mono opacity-80" title={t("scheduler.waitingLabel")()}>
                  {t("scheduler.waitingLabel")() || "排队"}: {item.waiting}
                </span>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
};

export default SchedulerLiveDistribution;
