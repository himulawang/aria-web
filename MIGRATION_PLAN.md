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

- [ ] **Task 4: Magnet Link & File Import**
  - Complexity: Medium
  - Description: Enhance `addTask` to handle Magnet and local file imports.
  - Verification: Input Magnet -> check RPC params.
  - Status: Completed

- [ ] **Task 5: Task Detail Editing UI**
  - Complexity: Medium
  - Description: Implement UI for changing `dir`, `out`, `split` via `aria2.changeOption`.
  - Verification: Change path -> `tellStatus` check.
  - Status: Completed

- [ ] **Task 6: Global Settings Panel**
  - Complexity: High
  - Description: Comprehensive UI for all `aria2.changeGlobalOption` settings.
  - Verification: Change setting -> `getGlobalOption` check.
  - Status: Completed

- [ ] **Task 7: UI/UX Visual Overhaul**
  - Complexity: High
  - Description: Improve visual aesthetics using lightweight components.
  - Verification: Manual visual review.
  - Status: Completed
