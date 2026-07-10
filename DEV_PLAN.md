# Aria2 Feature Implementation - Developer Plan (DEV_PLAN.md)

This plan breaks down the feature requirements into highly granular, context-isolated tasks to ensure safe execution. Each task should be completed, verified, and checked in separately to manage the context window efficiently.

---

## Task Progress Checklist

### Feature A: 任务队列优先级管理 (Task Queue Reordering)
- [x] **Task A.1**: Implement `aria2Store.changePosition(gid, pos, how)` in [aria2-store.ts](file:///home/ila/project/aria-web/src/store/aria2-store.ts).
- [x] **Task A.2**: Add sorting/move buttons (Top, Up, Down, Bottom) to each task row in [TaskList.tsx](file:///home/ila/project/aria-web/src/components/TaskList.tsx) when task status is `paused` or `waiting`.
- [x] **Task A.3**: Implement click handling, disable button interactions while loading, and add brief highlight feedback (micro-animations).

### Feature B: 任务强制操作与全局批量控制 (Force Actions & Global Controls)
- [x] **Task B.1**: Implement core functions `forcePauseTask(gid)`, `forceRemoveTask(gid)`, `pauseAll()`, `forcePauseAll()`, and `resumeAll()` in [aria2-store.ts](file:///home/ila/project/aria-web/src/store/aria2-store.ts).
- [x] **Task B.2**: Add a global action toolbar in [TaskList.tsx](file:///home/ila/project/aria-web/src/components/TaskList.tsx) header containing "Resume All", "Pause All", and "Force Pause All" dropdown options.
- [x] **Task B.3**: Support holding the `Shift` key while clicking Pause/Delete buttons to trigger force actions with dynamic tooltip hints.
- [x] **Task B.4**: Add a "Force delete immediately" checkbox inside the delete confirmation modal.

### Feature C: ED2K/eMule 资源检索与下载 (ED2K Search & Import)
- [ ] **Task C.1**: Implement ED2K RPC helpers `ed2kSearch(keyword)` and `getEd2kSearchResults(searchId)` in [aria2-store.ts](file:///home/ila/project/aria-web/src/store/aria2-store.ts).
- [ ] **Task C.2**: Create a new sidebar view component `Ed2kSearch.tsx` with search input and filters (file type, sorting).
- [ ] **Task C.3**: Implement polling loop for ED2K search results and skeleton loading feedback.
- [ ] **Task C.4**: Implement download "+" button to parse the ED2K URI and call `aria2Store.addTask`.
- [ ] **Task C.5**: Integrate the "ED2K Search" view into [Layout.tsx](file:///home/ila/project/aria-web/src/components/Layout.tsx) and view switching in [App.tsx](file:///home/ila/project/aria-web/src/App.tsx).

### Feature D: 任务连接服务器明细面板 (Servers Connection Details Dashboard)
- [ ] **Task D.1**: Verify and ensure `getServers(gid)` in [aria2-store.ts](file:///home/ila/project/aria-web/src/store/aria2-store.ts) handles return values and errors gracefully.
- [ ] **Task D.2**: Add a conditional **"Servers"** tab in [TaskDetail.tsx](file:///home/ila/project/aria-web/src/components/TaskDetail.tsx) visible only for HTTP/FTP downloads.
- [ ] **Task D.3**: Add the servers listing table showing Host/IP, Port, Status, Speed, and Ranges.
- [ ] **Task D.4**: Add 2.5-second polling logic to refresh the connection list when the "Servers" tab is active.

### Feature E: 任务源链接(URI)动态修改器 (Source URI Manager)
- [ ] **Task E.1**: Implement `getUris(gid)` in [aria2-store.ts](file:///home/ila/project/aria-web/src/store/aria2-store.ts).
- [ ] **Task E.2**: Create a "Manage Links" dialog modal wrapper triggered from file lists in [TaskDetail.tsx](file:///home/ila/project/aria-web/src/components/TaskDetail.tsx).
- [ ] **Task E.3**: Render the list of current URIs with status badges and deletion actions in the modal.
- [ ] **Task E.4**: Add textarea for inputting multiple new mirror URLs.
- [ ] **Task E.5**: Connect save button action to trigger `aria2Store.changeUri` and trigger details refresh.

### Feature F: 服务器生命周期管理与垃圾回收 (Server Control & Trash Disposal)
- [ ] **Task F.1**: Implement `purgeDownloadResult()`, `forceShutdown()`, and `getSessionInfo()` in [aria2-store.ts](file:///home/ila/project/aria-web/src/store/aria2-store.ts).
- [ ] **Task F.2**: Display the current Session ID (retrieved from `getSessionInfo`) inside [StatusView.tsx](file:///home/ila/project/aria-web/src/components/StatusView.tsx).
- [ ] **Task F.3**: Retrieve and display system notification features via `system.listNotifications` inside [StatusView.tsx](file:///home/ila/project/aria-web/src/components/StatusView.tsx).
- [ ] **Task F.4**: Add the "Force Shutdown" button alternative dropdown option inside [StatusView.tsx](file:///home/ila/project/aria-web/src/components/StatusView.tsx).
- [ ] **Task F.5**: Add a "Purge Completed" button (Icon: broom/trash) to the [TaskList.tsx](file:///home/ila/project/aria-web/src/components/TaskList.tsx) toolbar calling `purgeDownloadResult`.
