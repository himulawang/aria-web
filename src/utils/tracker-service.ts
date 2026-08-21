import { aria2Store } from "../store";
import { notificationStore } from "../store/notification-store";
import { logger } from "../core/logger";

const LOG_CONTEXT = "TrackerService";

export const TRACKER_SOURCES = [
  {
    name: "TrackersList (Best / Recommended)",
    url: "https://cf.trackerslist.com/best.txt",
    fallbackUrl: "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best.txt",
  },
  {
    name: "TrackersList (All)",
    url: "https://cf.trackerslist.com/all.txt",
    fallbackUrl: "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all.txt",
  },
  {
    name: "XIU2 TrackersList Collection",
    url: "https://raw.githubusercontent.com/XIU2/TrackersListCollection/master/best.txt",
    fallbackUrl: "https://cdn.jsdelivr.net/gh/XIU2/TrackersListCollection/best.txt",
  },
];

export const trackerService = {
  async fetchTrackers(sourceUrl = TRACKER_SOURCES[0].url): Promise<string[]> {
    logger.info(`Fetching latest trackers from: ${sourceUrl}`, LOG_CONTEXT);
    try {
      const resp = await fetch(sourceUrl, { cache: "no-cache" });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      const text = await resp.text();
      return this.parseTrackers(text);
    } catch (err) {
      logger.warn(`Primary tracker fetch failed (${err}), trying fallback...`, LOG_CONTEXT);
      const source = TRACKER_SOURCES.find((s) => s.url === sourceUrl);
      if (source && source.fallbackUrl) {
        const fallbackResp = await fetch(source.fallbackUrl, { cache: "no-cache" });
        if (fallbackResp.ok) {
          const text = await fallbackResp.text();
          return this.parseTrackers(text);
        }
      }
      throw err;
    }
  },

  parseTrackers(rawText: string): string[] {
    const lines = rawText
      .split(/[\r\n,]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && (l.startsWith("http://") || l.startsWith("https://") || l.startsWith("udp://") || l.startsWith("wss://") || l.startsWith("ws://")));

    // Deduplicate
    return Array.from(new Set(lines));
  },

  async syncTrackersToAria2(sourceUrl?: string): Promise<{ count: number; trackers: string[] }> {
    try {
      const trackers = await this.fetchTrackers(sourceUrl);
      if (trackers.length === 0) {
        throw new Error("No valid trackers found in source");
      }

      const trackerStr = trackers.join(",");
      await aria2Store.changeGlobalOption("bt-tracker", trackerStr);

      logger.info(`Successfully updated aria2 bt-tracker option with ${trackers.length} trackers`, LOG_CONTEXT);
      notificationStore.add(`Successfully synced ${trackers.length} BT trackers to Aria2`, "success");
      return { count: trackers.length, trackers };
    } catch (err: any) {
      logger.error(`Failed to sync trackers: ${err?.message || err}`, LOG_CONTEXT);
      notificationStore.add(`Failed to sync trackers: ${err?.message || err}`, "error");
      throw err;
    }
  },
};
