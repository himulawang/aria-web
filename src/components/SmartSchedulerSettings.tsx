import { type Component, createSignal, For, Show } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import type { SchedulerRule } from "../config/scheduler-config";
import SchedulerLiveDistribution from "./SchedulerLiveDistribution";
import {
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineArrowPath,
  HiOutlineSparkles,
  HiOutlineCheck,
  HiOutlineArrowPathRoundedSquare,
} from "solid-icons/hi";

const COLOR_PRESETS = [
  "#3b82f6", // Blue
  "#f97316", // Orange
  "#8b5cf6", // Purple
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#eab308", // Yellow
  "#64748b", // Slate
];

const SmartSchedulerSettings: Component = () => {
  const state = aria2Store.getState();
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [editingRuleId, setEditingRuleId] = createSignal<string | null>(null);

  // Form state for rule modal
  const [ruleName, setRuleName] = createSignal("");
  const [ruleMatchType, setRuleMatchType] = createSignal<"keyword" | "regex">("keyword");
  const [ruleMatchPattern, setRuleMatchPattern] = createSignal("");
  const [ruleMatchField, setRuleMatchField] = createSignal<"url" | "dir" | "both">("both");
  const [ruleMaxSlots, setRuleMaxSlots] = createSignal<string>("");
  const [rulePriority, setRulePriority] = createSignal<number>(1);
  const [ruleBadgeColor, setRuleBadgeColor] = createSignal<string>(COLOR_PRESETS[0]);

  const config = () => state.schedulerConfig;

  const updateConfig = async (key: string, value: any) => {
    await aria2Store.updateSchedulerConfig({ [key]: value });
  };

  const openAddModal = () => {
    setEditingRuleId(null);
    setRuleName("");
    setRuleMatchType("keyword");
    setRuleMatchPattern("");
    setRuleMatchField("both");
    setRuleMaxSlots("");
    setRulePriority(1);
    setRuleBadgeColor(COLOR_PRESETS[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: SchedulerRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleMatchType(rule.matchType);
    setRuleMatchPattern(rule.matchPattern);
    setRuleMatchField(rule.matchField);
    setRuleMaxSlots(rule.maxSlots !== null && rule.maxSlots !== undefined ? String(rule.maxSlots) : "");
    setRulePriority(rule.priority || 1);
    setRuleBadgeColor(rule.badgeColor || COLOR_PRESETS[0]);
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: Event) => {
    e.preventDefault();
    const name = ruleName().trim();
    const pattern = ruleMatchPattern().trim();
    if (!name || !pattern) return;

    const maxSlotsVal = ruleMaxSlots().trim() === "" ? null : Math.max(1, parseInt(ruleMaxSlots(), 10) || 1);

    const currentRules = config().rules || [];
    let newRules: SchedulerRule[];

    if (editingRuleId()) {
      newRules = currentRules.map((r) =>
        r.id === editingRuleId()
          ? {
              ...r,
              name,
              matchType: ruleMatchType(),
              matchPattern: pattern,
              matchField: ruleMatchField(),
              maxSlots: maxSlotsVal,
              priority: rulePriority(),
              badgeColor: ruleBadgeColor(),
            }
          : r,
      );
    } else {
      const newRule: SchedulerRule = {
        id: `rule-${Date.now()}`,
        name,
        enabled: true,
        matchType: ruleMatchType(),
        matchPattern: pattern,
        matchField: ruleMatchField(),
        maxSlots: maxSlotsVal,
        priority: rulePriority(),
        badgeColor: ruleBadgeColor(),
      };
      newRules = [...currentRules, newRule];
    }

    await aria2Store.updateSchedulerConfig({ rules: newRules });
    setIsModalOpen(false);
  };

  const toggleRuleEnabled = async (ruleId: string, enabled: boolean) => {
    const currentRules = config().rules || [];
    const newRules = currentRules.map((r) => (r.id === ruleId ? { ...r, enabled } : r));
    await aria2Store.updateSchedulerConfig({ rules: newRules });
  };

  const deleteRule = async (ruleId: string) => {
    const currentRules = config().rules || [];
    const newRules = currentRules.filter((r) => r.id !== ruleId);
    await aria2Store.updateSchedulerConfig({ rules: newRules });
  };

  const handleResetPresets = async () => {
    const confirmText = t("scheduler.resetPresetsConfirm")() || "确定要恢复默认预设规则（百度、夸克、阿里、115等）吗？";
    if (confirm(confirmText)) {
      await aria2Store.resetSchedulerRules();
    }
  };

  const handleTriggerBalance = async () => {
    await aria2Store.triggerSmartBalance();
  };

  const handleInterleaveQueue = async () => {
    await aria2Store.manualInterleaveQueue();
  };

  return (
    <div class="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <HiOutlineSparkles class="w-7 h-7 text-primary" />
            {t("scheduler.title")() || "智能多源并发调度"}
          </h2>
          <p class="text-xs text-base-content/70 mt-1">
            {t("scheduler.subtitle")() ||
              "自动平衡来自不同网盘或目录的下载任务，防止单网盘垄断全部并发线程，实现穿插并行下载。"}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="btn btn-sm btn-outline gap-1.5"
            onClick={handleInterleaveQueue}
            title={t("scheduler.tooltipInterleave")() || "将等待队列按来源交替重排"}
          >
            <HiOutlineArrowPathRoundedSquare class="w-4 h-4" />
            {t("scheduler.interleaveNow")() || "一键交错队列"}
          </button>
          <button
            class="btn btn-sm btn-primary gap-1.5"
            onClick={handleTriggerBalance}
            title={t("scheduler.tooltipBalance")() || "立即检查并执行多源线程均衡"}
          >
            <HiOutlineArrowPath class="w-4 h-4" />
            {t("scheduler.balanceNow")() || "立即均衡线程"}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div class="flex-1 overflow-y-auto pr-2 space-y-6">
        {/* Live Status Card */}
        <SchedulerLiveDistribution showActions={false} />

        {/* Global Scheduler Settings Card */}
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body p-4 sm:p-5">
            <h3 class="card-title text-base mb-2">
              {t("scheduler.globalConfig")() || "调度策略与参数"}
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Enable toggle */}
              <div class="form-control bg-base-200/40 p-3 rounded-lg flex flex-row items-center justify-between border border-base-300/60">
                <div>
                  <div class="font-medium text-sm">
                    {t("scheduler.enableAuto")() || "启用自动智能均衡"}
                  </div>
                  <div class="text-xs text-base-content/70">
                    {t("scheduler.enableAutoDesc")() ||
                      "检测到单网盘占满线程且有其他网盘排队时，自动匀出槽位"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  class="toggle toggle-primary"
                  checked={config().enabled}
                  onChange={(e) => updateConfig("enabled", e.currentTarget.checked)}
                />
              </div>

              {/* Auto interleave toggle */}
              <div class="form-control bg-base-200/40 p-3 rounded-lg flex flex-row items-center justify-between border border-base-300/60">
                <div>
                  <div class="font-medium text-sm">
                    {t("scheduler.autoInterleave")() || "等待队列自动穿插洗牌"}
                  </div>
                  <div class="text-xs text-base-content/70">
                    {t("scheduler.autoInterleaveDesc")() ||
                      "批量添加任务时，自动按来源交错排队 (Round-Robin)"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  class="toggle toggle-primary"
                  checked={config().autoInterleaveQueue}
                  onChange={(e) =>
                    updateConfig("autoInterleaveQueue", e.currentTarget.checked)
                  }
                />
              </div>

              {/* Strategy selection */}
              <div class="form-control w-full">
                <label class="label py-1">
                  <span class="label-text text-xs font-semibold">
                    {t("scheduler.strategy")() || "分配模式"}
                  </span>
                </label>
                <select
                  class="select select-bordered select-sm w-full"
                  value={config().strategy}
                  onChange={(e) => updateConfig("strategy", e.currentTarget.value)}
                >
                  <option value="fair_share">
                    {t("scheduler.strategyFairShare")() || "公平均分 (Fair-Share) - 动态平分活跃线程"}
                  </option>
                  <option value="fixed_quota">
                    {t("scheduler.strategyFixedQuota")() || "固定上限配额 (Fixed Quota) - 按各源设定上限"}
                  </option>
                </select>
              </div>

              {/* Cooldown */}
              <div class="form-control w-full">
                <label class="label py-1">
                  <span class="label-text text-xs font-semibold">
                    {t("scheduler.cooldown")() || "调度防抖冷却时间 (秒)"}
                  </span>
                </label>
                <input
                  type="number"
                  min="3"
                  max="300"
                  class="input input-bordered input-sm w-full"
                  value={config().cooldownSeconds}
                  onInput={(e) =>
                    updateConfig(
                      "cooldownSeconds",
                      Math.max(3, parseInt(e.currentTarget.value, 10) || 10),
                    )
                  }
                />
              </div>

              {/* Progress Protection Threshold */}
              <div class="form-control w-full md:col-span-2">
                <label class="label py-1">
                  <span class="label-text text-xs font-semibold">
                    {t("scheduler.protectProgress")() || "高进度保护阈值 (%)"}
                  </span>
                  <span class="label-text-alt text-xs text-base-content/70">
                    {t("scheduler.protectProgressDesc")() || "已下载超过此进度的任务绝不暂停让出槽位"}
                  </span>
                </label>
                <div class="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="99"
                    class="range range-primary range-sm flex-1"
                    value={config().protectProgressPercent}
                    onInput={(e) =>
                      updateConfig(
                        "protectProgressPercent",
                        parseInt(e.currentTarget.value, 10) || 80,
                      )
                    }
                  />
                  <span class="badge badge-neutral w-14 font-mono">
                    {config().protectProgressPercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rules Manager Card */}
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body p-4 sm:p-5">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="card-title text-base">
                  {t("scheduler.rulesTitle")() || "网盘/来源识别与配额规则"}
                </h3>
                <p class="text-xs text-base-content/70">
                  {t("scheduler.rulesSubtitle")() ||
                    "支持自定义关键字与正则表达式匹配 URL 或保存目录，扩展任何新网盘"}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="btn btn-xs btn-ghost text-base-content/70"
                  onClick={handleResetPresets}
                >
                  {t("scheduler.resetPresets")() || "恢复默认预设"}
                </button>
                <button
                  class="btn btn-sm btn-primary gap-1"
                  onClick={openAddModal}
                >
                  <HiOutlinePlus class="w-4 h-4" />
                  {t("scheduler.addRule")() || "添加规则"}
                </button>
              </div>
            </div>

            {/* Rules Table */}
            <div class="overflow-x-auto">
              <table class="table table-sm w-full">
                <thead>
                  <tr class="bg-base-200/60 text-xs">
                    <th class="w-12 text-center">{t("scheduler.tableEnabled")() || "启用"}</th>
                    <th>{t("scheduler.tableName")() || "规则名称"}</th>
                    <th>{t("scheduler.tableTarget")() || "匹配目标"}</th>
                    <th>{t("scheduler.tablePattern")() || "匹配方式 & 特征词"}</th>
                    <th>{t("scheduler.tableLimit")() || "最大线程限制"}</th>
                    <th class="w-24 text-center">{t("scheduler.tableActions")() || "操作"}</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={config().rules}
                    fallback={
                      <tr>
                        <td colspan={6} class="text-center py-6 text-base-content/60">
                          {t("scheduler.tableEmpty")() || "暂无规则，请点击右上角「添加规则」"}
                        </td>
                      </tr>
                    }
                  >
                    {(rule) => (
                      <tr class="hover">
                        <td class="text-center">
                          <input
                            type="checkbox"
                            class="checkbox checkbox-xs checkbox-primary"
                            checked={rule.enabled}
                            onChange={(e) =>
                              toggleRuleEnabled(rule.id, e.currentTarget.checked)
                            }
                          />
                        </td>
                        <td>
                          <div class="flex items-center gap-2">
                            <span
                              class="w-3 h-3 rounded-full shrink-0"
                              style={{ "background-color": rule.badgeColor || "#3b82f6" }}
                            />
                            <span class="font-medium text-sm">{rule.name}</span>
                          </div>
                        </td>
                        <td>
                          <span class="badge badge-sm badge-ghost font-mono text-xs">
                            {rule.matchField === "both"
                              ? (t("scheduler.matchFieldBoth")() || "URL + 目录")
                              : rule.matchField === "url"
                              ? (t("scheduler.matchFieldUrl")() || "仅 URL")
                              : (t("scheduler.matchFieldDir")() || "仅目录")}
                          </span>
                        </td>
                        <td>
                          <div class="flex items-center gap-1.5">
                            <span class="badge badge-xs badge-outline">
                              {rule.matchType === "keyword"
                                ? (t("scheduler.matchTypeKeyword")() || "关键字")
                                : (t("scheduler.matchTypeRegex")() || "正则")}
                            </span>
                            <code class="bg-base-200 px-1.5 py-0.5 rounded text-xs text-primary font-mono">
                              {rule.matchPattern}
                            </code>
                          </div>
                        </td>
                        <td>
                          <span class="text-xs">
                            {rule.maxSlots !== null && rule.maxSlots !== undefined
                              ? (t("scheduler.limitMax")()?.replace("{count}", String(rule.maxSlots)) || `最多 ${rule.maxSlots} 线程`)
                              : (t("scheduler.limitAuto")() || "自动均衡 (无限制)")}
                          </span>
                        </td>
                        <td>
                          <div class="flex items-center justify-center gap-1">
                            <button
                              class="btn btn-ghost btn-xs btn-square"
                              onClick={() => openEditModal(rule)}
                              title={t("scheduler.editTooltip")() || "编辑规则"}
                            >
                              <HiOutlinePencilSquare class="w-4 h-4" />
                            </button>
                            <button
                              class="btn btn-ghost btn-xs btn-square text-error"
                              onClick={() => deleteRule(rule.id)}
                              title={t("scheduler.deleteTooltip")() || "删除规则"}
                            >
                              <HiOutlineTrash class="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Rule Modal */}
      <Show when={isModalOpen()}>
        <div class="modal modal-open">
          <div class="modal-box max-w-lg">
            <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
              <HiOutlineSparkles class="w-5 h-5 text-primary" />
              {editingRuleId()
                ? (t("scheduler.editRule")() || "编辑来源规则")
                : (t("scheduler.addNewRule")() || "添加新来源规则")}
            </h3>

            <form onSubmit={handleSaveRule} class="space-y-4">
              {/* Name */}
              <div class="form-control w-full">
                <label class="label py-1">
                  <span class="label-text text-xs font-semibold">{t("scheduler.ruleName")() || "规则名称"}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("scheduler.ruleNamePlaceholder")() || "例如: 百度网盘 / 夸克网盘"}
                  class="input input-bordered input-sm w-full"
                  value={ruleName()}
                  onInput={(e) => setRuleName(e.currentTarget.value)}
                />
              </div>

              {/* Match Field & Type */}
              <div class="grid grid-cols-2 gap-3">
                <div class="form-control">
                  <label class="label py-1">
                    <span class="label-text text-xs font-semibold">{t("scheduler.matchField")() || "匹配字段"}</span>
                  </label>
                  <select
                    class="select select-bordered select-sm w-full"
                    value={ruleMatchField()}
                    onChange={(e) => setRuleMatchField(e.currentTarget.value as any)}
                  >
                    <option value="both">{t("scheduler.matchFieldBoth")() || "URL 与保存目录两者"}</option>
                    <option value="url">{t("scheduler.matchFieldUrl")() || "仅下载链接 (URL)"}</option>
                    <option value="dir">{t("scheduler.matchFieldDir")() || "仅保存目录 (Dir)"}</option>
                  </select>
                </div>

                <div class="form-control">
                  <label class="label py-1">
                    <span class="label-text text-xs font-semibold">{t("scheduler.matchType")() || "匹配方式"}</span>
                  </label>
                  <select
                    class="select select-bordered select-sm w-full"
                    value={ruleMatchType()}
                    onChange={(e) => setRuleMatchType(e.currentTarget.value as any)}
                  >
                    <option value="keyword">{t("scheduler.matchTypeKeyword")() || "包含关键字 (忽略大小写)"}</option>
                    <option value="regex">{t("scheduler.matchTypeRegex")() || "正则表达式 (Regex)"}</option>
                  </select>
                </div>
              </div>

              {/* Pattern */}
              <div class="form-control w-full">
                <label class="label py-1">
                  <span class="label-text text-xs font-semibold">{t("scheduler.matchPattern")() || "匹配特征词/表达式"}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    ruleMatchType() === "keyword"
                      ? (t("scheduler.matchPatternKeywordPlaceholder")() || "例如: BaiduNetdisk 或 Quark")
                      : (t("scheduler.matchPatternRegexPlaceholder")() || "例如: BaiduNetdisk|baidupcs")
                  }
                  class="input input-bordered input-sm w-full font-mono text-sm"
                  value={ruleMatchPattern()}
                  onInput={(e) => setRuleMatchPattern(e.currentTarget.value)}
                />
                <label class="label py-0.5">
                  <span class="label-text-alt text-xs text-base-content/60">
                    {t("scheduler.matchPatternHint")() || "Alist 任务通常在 URL 中包含网盘标识（如 BaiduNetdisk、Quark）"}
                  </span>
                </label>
              </div>

              {/* Max Slots & Color */}
              <div class="grid grid-cols-2 gap-3">
                <div class="form-control">
                  <label class="label py-1">
                    <span class="label-text text-xs font-semibold">{t("scheduler.maxSlots")() || "固定线程配额 (可选)"}</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={t("scheduler.maxSlotsPlaceholder")() || "留空则自动均分"}
                    class="input input-bordered input-sm w-full"
                    value={ruleMaxSlots()}
                    onInput={(e) => setRuleMaxSlots(e.currentTarget.value)}
                  />
                </div>

                <div class="form-control">
                  <label class="label py-1">
                    <span class="label-text text-xs font-semibold">{t("scheduler.badgeColor")() || "徽章颜色"}</span>
                  </label>
                  <div class="flex items-center gap-1.5 flex-wrap pt-1">
                    <For each={COLOR_PRESETS}>
                      {(c) => (
                        <button
                          type="button"
                          class={`w-6 h-6 rounded-full border-2 transition-transform ${
                            ruleBadgeColor() === c
                              ? "scale-110 border-base-content"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ "background-color": c }}
                          onClick={() => setRuleBadgeColor(c)}
                        />
                      )}
                    </For>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div class="modal-action mt-6">
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  {t("common.cancel")() || "取消"}
                </button>
                <button type="submit" class="btn btn-sm btn-primary gap-1">
                  <HiOutlineCheck class="w-4 h-4" />
                  {t("scheduler.saveRule")() || "保存规则"}
                </button>
              </div>
            </form>
          </div>
          <div class="modal-backdrop bg-black/40" onClick={() => setIsModalOpen(false)} />
        </div>
      </Show>
    </div>
  );
};

export default SmartSchedulerSettings;
