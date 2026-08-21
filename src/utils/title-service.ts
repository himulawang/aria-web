import { aria2Store } from "../store/aria2-store";
import { formatSpeed } from "./format";

export const titleService = {
  updateTitle: () => {
    const state = aria2Store.getState();
    const stat = state.globalStat;
    const appName = "aria-web";

    if (!stat) {
      if (document.title !== appName) {
        document.title = appName;
      }
      return;
    }

    const downSpeed = formatSpeed(Number(stat.downloadSpeed || 0));
    const upSpeed = formatSpeed(Number(stat.uploadSpeed || 0));
    
    // Matching AriaNg behavior: (D: 1.2 MB/s, U: 50 KB/s) - aria-web
    const newTitle = `(D: ${downSpeed}, U: ${upSpeed}) - ${appName}`;
    if (document.title !== newTitle) {
      document.title = newTitle;
    }
  }
};
