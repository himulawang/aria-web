# Aria-Web Migration Plan from AriaNg

## Project Goal
Migrate all features from AriaNg to aria-web, maintaining the lightweight SolidJS architecture while enhancing UI/UX and functionality.

## Workflow for each task:
1. **Implementation**: Write code and integrate into `aria-web`.
2. **Verification**: Create and run a verification script or test case.
3. **Review**: Perform a self-code-review for type safety and performance.
4. **Commit**: Git commit with message `migration: [task-name]`.
5. **Close**: Mark task as Completed in this file.

## Task List (Sorted by Complexity: Low $\rightarrow$ High)

- [x] **Task 1: Notification System Enhancements**
  - Complexity: Low
  - Description: Migrate diverse notification types from AriaNg.
  - Verification: Trigger event -> check Toast content.
  - Status: Completed

- [x] **Task 2: Global Keyboard Shortcuts**
  - Complexity: Low
  - Description: Implement `ariaNgKeyboardService` logic for global hotkeys.
  - Verification: KeyDown event -> trigger Action.
  - Status: Completed

- [x] **Task 3: i18n Multi-language Support**
  - Complexity: Medium
  - Description: Implement language loading and switching mechanism.
  - Verification: Switch lang -> check UI text.
  - Status: Completed

- [x] **Task 4: Magnet Link & File Import**
  - Complexity: Medium
  - Description: Enhance `addTask` to handle Magnet and local file imports.
  - Verification: Input Magnet -> check RPC params.
  - Status: Completed

- [x] **Task 5: Task Detail Editing UI**
  - Complexity: Medium
  - Description: Implement UI for changing `dir`, `out`, `split` via `aria2.changeOption`.
  - Verification: Change path -> `tellStatus` check.
  - Status: Completed

- [x] **Task 6: Global Settings Panel**
  - Complexity: High
  - Description: Comprehensive UI for all `aria2.changeGlobalOption` settings.
  - Verification: Change setting -> `getGlobalOption` check.
  - Status: Completed

- [x] **Task 7: UI/UX Visual Overhaul**
  - Complexity: High
  - Description: Improve visual aesthetics using lightweight components.
  - Verification: Manual visual review.
  - Status: Completed

- [x] **Task 8: Debug View**
  - Complexity: Medium
  - Description: Migrate the Debug view from AriaNg, including RPC method execution and internal logging.
  - Verification: Execute RPC method -> check response; trigger log -> check log list.
  - Status: Completed

- [x] **Task 9: Dynamic Document Title with Speed Display**
  - Complexity: Low
  - Description: Dynamically update the browser tab title (`document.title`) with overall download/upload speeds (e.g. `(D: 1.2 MB/s, U: 50 KB/s) - aria-web`), matching `ariaNgTitleService.js` behavior.
  - Verification: Connect and start downloading -> confirm browser tab title changes in real-time.
  - Status: Completed

- [x] **Task 10: Task List Search & Dynamic Filtering**
  - Complexity: Low
  - Description: Add a search input in `TaskList.tsx` to dynamically filter tasks by filename.
  - Verification: Type filename fragment -> list filters instantly.
  - Status: Completed

- [x] **Task 11: Task List Sorting Control**
  - Complexity: Medium
  - Description: Support sorting the task list by filename, total size, progress, speed, or remaining time.
  - Verification: Choose sorting parameter -> verify order updates accordingly.
  - Status: Completed

- [x] **Task 12: Create Task with Custom Parameters UI**
  - Complexity: Medium
  - Description: Extend `AddTask.tsx` with an "Advanced Settings" accordion. Render input fields for custom options (e.g., `dir`, `out`, `header`, `user-agent`, `split`) and pass them during task creation.
  - Verification: Enter custom folder or HTTP header -> check RPC invocation payload.
  - Status: Completed

- [x] **Task 13: Torrent File Selection (Selective Downloading)**
  - Complexity: Medium
  - Description: Add checkboxes next to files in the `files` tab in `TaskDetail.tsx` to toggle selective download via `aria2.changeOption` with the `select-file` parameter.
  - Verification: Uncheck a file -> verify RPC call to `aria2.changeOption` contains `select-file` with the correct index list.
  - Status: Completed

- [x] **Task 14: Metalink File Import UI & Integration**
  - Complexity: Low
  - Description: Integrate `.metalink` file upload in `AddTask.tsx` to read the file as base64 and invoke `aria2Store.addMetalinkTask`.
  - Verification: Import a `.metalink` file -> check if `addMetalinkTask` is triggered with correct payload.
  - Status: Completed

- [x] **Task 15: Export CLI Command & RPC API Dialog**
  - Complexity: Medium
  - Description: Add a "Show Command / API" action in `TaskDetail.tsx` opening a dialog that shows equivalent `aria2c` command-line command or raw JSON-RPC payload, matching AriaNg's export dialog.
  - Verification: Click action -> see copyable CLI command or JSON payload with all custom task headers/settings.
  - Status: Completed

- [x] **Task 16: Rich Peer Metadata & Client Resolution**
  - Complexity: Low
  - Description: Enrich the `peers` tab in `TaskDetail.tsx` with client name resolution (User-Agent) and individual peer download progress.
  - Verification: Download BT task -> view peers tab -> see peer client software name and download progress.
  - Status: Completed
