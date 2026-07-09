import { storageDB } from "../core/storage-db";

const HISTORY_PREFIX = "setting_history:";
const MAX_HISTORY = 10;

export const settingsHistory = {
  async getHistory(key: string): Promise<string[]> {
    return (await storageDB.get<string[]>(`${HISTORY_PREFIX}${key}`)) || [];
  },

  async addHistory(key: string, value: string) {
    const history = await this.getHistory(key);
    if (history[0] === value) return;

    const newHistory = [value, ...history.filter(v => v !== value)].slice(0, MAX_HISTORY);
    await storageDB.set(`${HISTORY_PREFIX}${key}`, newHistory);
  },

  async clearHistory(key: string) {
    await storageDB.remove(`${HISTORY_PREFIX}${key}`);
  }
};
