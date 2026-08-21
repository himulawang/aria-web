import type { Aria2Client } from "../core/aria2-client";
import type { SchedulerRule, SmartSchedulerConfig } from "../config/scheduler-config";
import { logger } from "../core/logger";

const LOG_CONTEXT = "SchedulerEngine";

/**
 * Match a task against user-defined scheduler rules.
 * Returns the first matching enabled rule or null.
 */
export function matchTaskRule(task: any, rules: SchedulerRule[]): SchedulerRule | null {
  if (!task || !rules || rules.length === 0) return null;

  // Extract URLs from files
  const uris: string[] = [];
  if (task.files && Array.isArray(task.files)) {
    for (const file of task.files) {
      if (file.uris && Array.isArray(file.uris)) {
        for (const u of file.uris) {
          if (u && u.uri) uris.push(u.uri);
        }
      }
    }
  }

  const dir = (task.dir || "").toLowerCase();
  const urlCombined = uris.join(" ").toLowerCase();

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const pattern = rule.matchPattern.trim();
    if (!pattern) continue;

    const testTarget = (target: string): boolean => {
      if (rule.matchType === "regex") {
        try {
          const regex = new RegExp(pattern, "i");
          return regex.test(target);
        } catch {
          return false;
        }
      }
      return target.toLowerCase().includes(pattern.toLowerCase());
    };

    let matched = false;
    if (rule.matchField === "url") {
      matched = testTarget(urlCombined);
    } else if (rule.matchField === "dir") {
      matched = testTarget(dir);
    } else {
      // "both"
      matched = testTarget(urlCombined) || testTarget(dir);
    }

    if (matched) {
      return rule;
    }
  }

  return null;
}

/**
 * Calculate download progress percentage (0 - 100).
 */
export function calculateTaskProgress(task: any): number {
  if (!task) return 0;
  const completed = Number(task.completedLength || 0);
  const total = Number(task.totalLength || 0);
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (completed / total) * 100));
}

/**
 * Interleaves waiting tasks across multiple matched rules (Round-Robin).
 */
export function interleaveWaitingTasks(waitingTasks: any[], rules: SchedulerRule[]): any[] {
  if (!waitingTasks || waitingTasks.length <= 1) return waitingTasks;

  // Group tasks by rule ID (or '__default__')
  const groups = new Map<string, any[]>();

  for (const task of waitingTasks) {
    const matchedRule = matchTaskRule(task, rules);
    const key = matchedRule ? matchedRule.id : "__default__";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(task);
  }

  // If all tasks belong to 1 group, no interleaving needed
  if (groups.size <= 1) return waitingTasks;

  const result: any[] = [];
  const groupQueues = Array.from(groups.values());

  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const queue of groupQueues) {
      if (queue.length > 0) {
        result.push(queue.shift());
        if (queue.length > 0) {
          hasMore = true;
        }
      }
    }
  }

  return result;
}

export interface SchedulerBalanceResult {
  balanced: boolean;
  pausedGids?: string[];
  promotedGids?: string[];
  reason?: string;
}

/**
 * Core smart balance algorithm.
 * Inspects active and waiting tasks, checks for thread monopoly, and fairly balances slots.
 */
export async function runSmartBalanceScheduler(
  client: Aria2Client,
  tasks: any[],
  config: SmartSchedulerConfig,
  maxConcurrent: number,
): Promise<SchedulerBalanceResult> {
  if (!config.enabled || !config.rules || config.rules.length === 0) {
    return { balanced: false, reason: "Scheduler disabled or no rules" };
  }

  const activeTasks = tasks.filter((t) => t.status === "active");
  const waitingTasks = tasks.filter((t) => t.status === "waiting");

  if (activeTasks.length === 0 || waitingTasks.length === 0) {
    return { balanced: false, reason: "No active or waiting tasks to balance" };
  }

  const effectiveMaxConcurrent = Math.max(1, maxConcurrent || activeTasks.length);

  // Group active tasks by rule ID
  const activeMap = new Map<string, any[]>();
  for (const task of activeTasks) {
    const rule = matchTaskRule(task, config.rules);
    const key = rule ? rule.id : "__default__";
    if (!activeMap.has(key)) activeMap.set(key, []);
    activeMap.get(key)!.push(task);
  }

  // Group waiting tasks by rule ID
  const waitingMap = new Map<string, any[]>();
  for (const task of waitingTasks) {
    const rule = matchTaskRule(task, config.rules);
    const key = rule ? rule.id : "__default__";
    if (!waitingMap.has(key)) waitingMap.set(key, []);
    waitingMap.get(key)!.push(task);
  }

  // Find all active or demanding rules
  const allInvolvedRuleKeys = new Set([...activeMap.keys(), ...waitingMap.keys()]);
  if (allInvolvedRuleKeys.size <= 1) {
    return { balanced: false, reason: "Only one source group present" };
  }

  // Calculate target quotas per group
  const targetQuotas = new Map<string, number>();

  if (config.strategy === "fair_share") {
    // Fair-share: split effective concurrency across all active & waiting groups
    const demandingCount = allInvolvedRuleKeys.size;
    const baseQuota = Math.floor(effectiveMaxConcurrent / demandingCount);
    const remainder = effectiveMaxConcurrent % demandingCount;

    let index = 0;
    for (const key of allInvolvedRuleKeys) {
      const quota = Math.max(1, baseQuota + (index < remainder ? 1 : 0));
      targetQuotas.set(key, quota);
      index++;
    }
  } else {
    // Fixed quota mode
    for (const key of allInvolvedRuleKeys) {
      const rule = config.rules.find((r) => r.id === key);
      if (rule && typeof rule.maxSlots === "number" && rule.maxSlots > 0) {
        targetQuotas.set(key, rule.maxSlots);
      } else {
        targetQuotas.set(key, effectiveMaxConcurrent);
      }
    }
  }

  // Find over-quota source groups (monopolizing)
  const overQuotaGroups: { key: string; excess: number; activeList: any[] }[] = [];
  for (const [key, activeList] of activeMap.entries()) {
    const quota = targetQuotas.get(key) || 1;
    if (activeList.length > quota) {
      overQuotaGroups.push({
        key,
        excess: activeList.length - quota,
        activeList,
      });
    }
  }

  // Find under-quota source groups with waiting tasks (starved)
  const starvedGroups: { key: string; needed: number; waitingList: any[] }[] = [];
  for (const [key, waitingList] of waitingMap.entries()) {
    const quota = targetQuotas.get(key) || 1;
    const currentActiveCount = (activeMap.get(key) || []).length;
    if (currentActiveCount < quota && waitingList.length > 0) {
      const needed = Math.min(quota - currentActiveCount, waitingList.length);
      starvedGroups.push({
        key,
        needed,
        waitingList,
      });
    }
  }

  if (overQuotaGroups.length === 0 || starvedGroups.length === 0) {
    return { balanced: false, reason: "Concurrency already balanced" };
  }

  // Determine tasks to pause and tasks to promote
  const tasksToPause: any[] = [];
  const tasksToPromote: any[] = [];

  for (const over of overQuotaGroups) {
    // Sort over-quota active tasks by progress ascending (pause lowest progress first)
    const sorted = [...over.activeList].sort((a, b) => {
      return calculateTaskProgress(a) - calculateTaskProgress(b);
    });

    // Filter out tasks exceeding protection threshold
    const candidates = sorted.filter(
      (t) => calculateTaskProgress(t) < config.protectProgressPercent,
    );

    const pauseCount = Math.min(over.excess, candidates.length);
    for (let i = 0; i < pauseCount; i++) {
      tasksToPause.push(candidates[i]);
    }
  }

  if (tasksToPause.length === 0) {
    return { balanced: false, reason: "All active tasks are protected by progress threshold" };
  }

  let slotsToFill = tasksToPause.length;
  for (const starved of starvedGroups) {
    const take = Math.min(starved.needed, slotsToFill, starved.waitingList.length);
    for (let i = 0; i < take; i++) {
      tasksToPromote.push(starved.waitingList[i]);
    }
    slotsToFill -= take;
    if (slotsToFill <= 0) break;
  }

  if (tasksToPromote.length === 0) {
    return { balanced: false, reason: "No waiting tasks eligible to promote" };
  }

  const finalPauseCount = Math.min(tasksToPause.length, tasksToPromote.length);
  const finalTasksToPause = tasksToPause.slice(0, finalPauseCount);
  const finalTasksToPromote = tasksToPromote.slice(0, finalPauseCount);

  logger.info(
    `Rebalancing slots: pausing ${finalTasksToPause.length} tasks from monopolized groups, promoting ${finalTasksToPromote.length} waiting tasks.`,
    LOG_CONTEXT,
  );

  try {
    // Step 1: Pause over-quota tasks to free active slots
    const pauseCalls = finalTasksToPause.map((t) => ({
      method: "aria2.pause",
      params: [t.gid],
    }));
    await client.multicall(pauseCalls);

    // Step 2: Elevate starved waiting tasks to position 0 (head of waiting queue)
    for (const t of finalTasksToPromote) {
      await client.request("aria2.changePosition", [t.gid, 0, "POS_SET"]);
    }

    // Step 3: Unpause the temporarily paused tasks so they re-enter waiting queue
    const unpauseCalls = finalTasksToPause.map((t) => ({
      method: "aria2.unpause",
      params: [t.gid],
    }));
    await client.multicall(unpauseCalls);

    return {
      balanced: true,
      pausedGids: finalTasksToPause.map((t) => t.gid),
      promotedGids: finalTasksToPromote.map((t) => t.gid),
    };
  } catch (err: any) {
    logger.error(`Error during balance execution: ${err?.message || err}`, LOG_CONTEXT);
    return { balanced: false, reason: err?.message || String(err) };
  }
}
