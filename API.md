# 已实现的服务端 API 列表

根据 `aria-web` 代码库中对 `Aria2Client.request` 的调用情况，目前已实现的服务端 API 如下：

## 系统方法 (System Methods)
- `system.listMethods`: 列出服务端支持的所有 RPC 方法。
- `system.multicall`: 批量调用多个 RPC 方法。

## Aria2 核心方法 (Aria2 Core Methods)
- `aria2.getGlobalStat`: 获取全局统计信息。
- `aria2.addUri`: 添加 URI 任务。
- `aria2.addTorrent`: 添加 Torrent 任务。
- `aria2.addMetalink`: 添加 Metalink 任务。
- `aria2.pause`: 暂停任务。
- `aria2.unpause`: 恢复任务。
- `aria2.remove`: 移除任务。
- `aria2.removeDownloadResult`: 移除下载结果。
- `aria2.changeOption`: 修改任务配置。
- `aria2.changeGlobalOption`: 修改全局配置。
- `aria2.saveSession`: 保存会话。
- `aria2.shutdown`: 关闭 Aria2 服务。

---
*注：此列表基于项目 `src/store/aria2-store.ts` 及 `src/core/aria2-client.ts` 中的调用点分析得出。*
