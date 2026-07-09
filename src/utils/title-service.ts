import { aria2Store } from "../store/aria2-store";
import { formatSpeed } from "./format";

export const titleService = {
  updateTitle: () => {
    const state = aria2Store.getState();
    const stat = state.globalStat;
    const appName = "aria-web";

    if (!stat) {
      document.title = appName;
      return;
    }

    const downSpeed = formatSpeed(stat.downloadSpeed);
    const upSpeed = formatSpeed(stat.uploadSpeed);
    
    // Matching AriaNg behavior: (D: 1.2 MB/s, U: 50 KB/s) - aria-web
    document.title = \`(D: \${downSpeed}, U: \${upSpeed}) - \${appName}\`;
  }
};
