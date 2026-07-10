# Aria2 API 实现情况对照表

根据 `aria-web` 项目代码库的实际调用情况，与 `aria2-next/API.md` 定义的官方标准 API 进行比对如下：

| 方法名 | 状态 | 说明 |
| :--- | :--- | :--- |
| `aria2.addUri` | 已实现 | |
| `aria2.addTorrent` | 已实现 | |
| `aria2.addMetalink` | 已实现 | |
| `aria2.remove` | 已实现 | |
| `aria2.forceRemove` | 未实现 | |
| `aria2.pause` | 已实现 | |
| `aria2.forcePause` | 未实现 | |
| `aria2.pauseAll` | 未实现 | |
| `aria2.forcePauseAll` | 未实现 | |
| `aria2.unpause` | 已实现 | 代码中调用 `aria2.unpause` |
| `aria2.unpauseAll` | 未实现 | |
| `aria2.tellStatus` | 未实现 | |
| `aria2.tellActive` | 未实现 | |
| `aria2.tellWaiting` | 未实现 | |
| `aria2.tellStopped` | 未实现 | |
| `aria2.getGlobalStat` | 已实现 | |
| `aria2.getUris` | 未实现 | |
| `aria2.getFiles` | 未实现 | |
| `aria2.getServers` | 未实现 | |
| `aria2.getPeers` | 未实现 | |
| `aria2.getOption` | 未实现 | |
| `aria2.changeOption` | 已实现 | |
| `aria2.getGlobalOption` | 未实现 | |
| `aria2.changeGlobalOption` | 已实现 | |
| `aria2.changeUri` | 未实现 | |
| `aria2.changePosition` | 未实现 | |
| `aria2.saveSession` | 已实现 | |
| `aria2.shutdown` | 已实现 | |
| `aria2.forceShutdown` | 未实现 | |
| `aria2.getVersion` | 未实现 | |
| `aria2.getSessionInfo` | 未实现 | |
| `aria2.purgeDownloadResult` | 未实现 | |
| `aria2.removeDownloadResult` | 已实现 | |
| `aria2.ed2kSearch` | 未实现 | |
| `aria2.getEd2kSearchResults` | 未实现 | |
| `system.multicall` | 已实现 | |
| `system.listMethods` | 已实现 | |
| `system.listNotifications` | 未实现 | |

---
*注：状态基于 `aria-web/src` 目录下的代码调用分析。*
