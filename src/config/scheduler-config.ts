export interface SchedulerRule {
  id: string;
  name: string;
  enabled: boolean;
  matchType: "keyword" | "regex";
  matchPattern: string;
  matchField: "url" | "dir" | "both";
  maxSlots: number | null; // null for auto fair-share allocation
  priority: number;
  badgeColor?: string;
}

export interface SmartSchedulerConfig {
  enabled: boolean;
  strategy: "fair_share" | "fixed_quota";
  cooldownSeconds: number;
  protectProgressPercent: number; // e.g. 80 -> don't pause tasks > 80%
  autoInterleaveQueue: boolean;
  rules: SchedulerRule[];
}

export const DEFAULT_SCHEDULER_RULES: SchedulerRule[] = [
  {
    id: "baidu-netdisk",
    name: "百度网盘",
    enabled: true,
    matchType: "keyword",
    matchPattern: "BaiduNetdisk",
    matchField: "both",
    maxSlots: null,
    priority: 1,
    badgeColor: "#3b82f6", // Blue
  },
  {
    id: "quark-netdisk",
    name: "夸克网盘",
    enabled: true,
    matchType: "keyword",
    matchPattern: "Quark",
    matchField: "both",
    maxSlots: null,
    priority: 1,
    badgeColor: "#f97316", // Orange
  },
  {
    id: "aliyun-netdisk",
    name: "阿里网盘",
    enabled: true,
    matchType: "regex",
    matchPattern: "AliYun|alipan",
    matchField: "both",
    maxSlots: null,
    priority: 1,
    badgeColor: "#8b5cf6", // Purple
  },
  {
    id: "115-netdisk",
    name: "115网盘",
    enabled: true,
    matchType: "keyword",
    matchPattern: "115",
    matchField: "both",
    maxSlots: null,
    priority: 1,
    badgeColor: "#10b981", // Green
  },
  {
    id: "123-netdisk",
    name: "123云盘",
    enabled: true,
    matchType: "keyword",
    matchPattern: "123pan",
    matchField: "both",
    maxSlots: null,
    priority: 1,
    badgeColor: "#ec4899", // Pink
  },
];

export const DEFAULT_SCHEDULER_CONFIG: SmartSchedulerConfig = {
  enabled: false,
  strategy: "fair_share",
  cooldownSeconds: 10,
  protectProgressPercent: 80,
  autoInterleaveQueue: true,
  rules: DEFAULT_SCHEDULER_RULES,
};
