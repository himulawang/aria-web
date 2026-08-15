/**
 * Natural Sort Comparator with Chinese & Arabic Numeral Parsing Support
 * Supports:
 * - 1.mp4, 2.mp4, 10.mp4, 20.mp4, 200.mp4
 * - 第1集.mp4, 第2集.mp4, 第10集.mp4, 第20集.mp4
 * - 第一集.mp4, 第二集.mp4, 第十集.mp4, 第十一集.mp4, 第二十集.mp4, 第一百集.mp4
 * - EP01, EP02, EP10, S01E01, Part 1, Part 2
 */

const CHINESE_DIGITS: Record<string, number> = {
  "零": 0, "〇": 0, "一": 1, "二": 2, "两": 2, "俩": 2, "三": 3, "四": 4,
  "五": 5, "六": 6, "七": 7, "八": 8, "九": 9,
  "壹": 1, "贰": 2, "叁": 3, "肆": 4, "伍": 5, "陆": 6, "柒": 7, "捌": 8, "玖": 9,
};

const CHINESE_UNITS: Record<string, number> = {
  "十": 10, "拾": 10, "百": 100, "佰": 100, "千": 1000, "仟": 1000,
  "万": 10000, "萬": 10000, "亿": 100000000,
};

export function parseChineseNumber(str: string): number | null {
  if (!str) return null;
  let total = 0;
  let section = 0;
  let num = 0;
  let valid = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char in CHINESE_DIGITS) {
      num = CHINESE_DIGITS[char];
      valid = true;
    } else if (char in CHINESE_UNITS) {
      valid = true;
      const unit = CHINESE_UNITS[char];
      if (unit === 10000 || unit === 100000000) {
        section = (section + num) * unit;
        total += section;
        section = 0;
        num = 0;
      } else {
        if (num === 0 && unit === 10 && (i === 0 || str[i - 1] === "第" || !CHINESE_DIGITS[str[i - 1]])) {
          num = 1;
        }
        section += num * unit;
        num = 0;
      }
    } else {
      return null;
    }
  }
  if (!valid) return null;
  return total + section + num;
}

interface Token {
  type: "num" | "str";
  val: number | string;
}

export function tokenizeForNaturalSort(s: string): Token[] {
  if (!s) return [];
  const tokens: Token[] = [];
  // Matches:
  // 1. Arabic integers (\d+)
  // 2. Chinese numerals (e.g. 第?([零一二两三四五六七八九十百千万]+)(?:集|话|期|季|卷|章)?)
  const regex = /(\d+)|(?:第?([零〇一二两俩三四五六七八九十拾百佰千仟万萬亿]+)(?:集|话|期|季|卷|章)?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(s)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "str", val: s.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ type: "num", val: Number(match[1]) });
    } else if (match[2] !== undefined) {
      const cnNum = parseChineseNumber(match[2]);
      if (cnNum !== null) {
        const fullMatch = match[0];
        const hasDi = fullMatch.startsWith("第");
        const suffix = fullMatch.endsWith("集")
          ? "集"
          : fullMatch.endsWith("话")
          ? "话"
          : fullMatch.endsWith("期")
          ? "期"
          : fullMatch.endsWith("季")
          ? "季"
          : fullMatch.endsWith("卷")
          ? "卷"
          : fullMatch.endsWith("章")
          ? "章"
          : "";
        if (hasDi) tokens.push({ type: "str", val: "第" });
        tokens.push({ type: "num", val: cnNum });
        if (suffix) tokens.push({ type: "str", val: suffix });
      } else {
        tokens.push({ type: "str", val: match[0] });
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < s.length) {
    tokens.push({ type: "str", val: s.slice(lastIndex) });
  }
  return tokens;
}

export function naturalCompare(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  const tokensA = tokenizeForNaturalSort(a);
  const tokensB = tokenizeForNaturalSort(b);
  const len = Math.min(tokensA.length, tokensB.length);

  for (let i = 0; i < len; i++) {
    const tokA = tokensA[i];
    const tokB = tokensB[i];

    if (tokA.type === "num" && tokB.type === "num") {
      if (tokA.val !== tokB.val) {
        return (tokA.val as number) - (tokB.val as number);
      }
    } else if (tokA.type === "str" && tokB.type === "str") {
      const cmp = (tokA.val as string).localeCompare(tokB.val as string, "zh-CN", {
        sensitivity: "base",
      });
      if (cmp !== 0) return cmp;
    } else {
      const strA = String(tokA.val);
      const strB = String(tokB.val);
      const cmp = strA.localeCompare(strB, "zh-CN", { sensitivity: "base" });
      if (cmp !== 0) return cmp;
    }
  }
  return tokensA.length - tokensB.length;
}

export function getTaskFileName(task: any): string {
  if (!task) return "";
  return (
    task.files?.[0]?.path?.split("/").pop() ||
    task.bittorrent?.info?.name ||
    task.gid ||
    ""
  );
}
