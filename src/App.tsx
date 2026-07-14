import { titleService } from "./utils/title-service";
import { createSignal, onMount, createEffect, onCleanup, type Component } from "solid-js";
import Layout from "./components/Layout";
import ConnectionSettings from "./components/ConnectionSettings";
import AppSettingsView from "./components/AppSettingsView";
import RpcProfileView from "./components/RpcProfileView";
import StatusView from "./components/StatusView";
import TaskList from "./components/TaskList";
import TaskDetail from "./components/TaskDetail";
import DebugView from "./components/DebugView";
import Ed2kSearch from "./components/Ed2kSearch";
import { aria2Store } from "./store";
import { aria2GlobalAvailableOptions } from "./config/aria2-available-options";
import { keyboardService } from "./utils/keyboard-service";

interface RouteState {
  view: "downloads" | "settings" | "status" | "app-settings" | "rpc-profiles" | "debug" | "ed2k";
  subTab?: string | null;
  taskGid?: string | null;
}

function parseHash(hash: string): RouteState {
  const cleanHash = hash.replace(/^#\/?/, "");
  if (!cleanHash) {
    return { view: "downloads", subTab: "active" };
  }

  const [pathPart, queryPart] = cleanHash.split("?");
  const pathSegments = pathPart.split("/").filter(Boolean);

  const queryParams = new URLSearchParams(queryPart || "");
  const taskGid = queryParams.get("task") || queryParams.get("gid");

  const primaryView = pathSegments[0];
  const subTab = pathSegments[1] || null;

  const validViews = ["downloads", "settings", "status", "app-settings", "rpc-profiles", "debug", "ed2k"];
  if (!validViews.includes(primaryView)) {
    return { view: "downloads", subTab: "active", taskGid };
  }

  return {
    view: primaryView as any,
    subTab,
    taskGid,
  };
}

function stringifyHash(state: RouteState): string {
  let hash = `#/${state.view}`;
  if (state.subTab) {
    hash += `/${state.subTab}`;
  }
  if (state.taskGid) {
    hash += `?task=${state.taskGid}`;
  }
  return hash;
}

const App: Component = () => {
  const initialRoute = parseHash(window.location.hash);

  const [view, setView] = createSignal<
    "downloads" | "settings" | "status" | "app-settings" | "rpc-profiles" | "debug" | "ed2k"
  >(initialRoute.view);

  const [activeSubTab, setActiveSubTab] = createSignal<string | null>(
    initialRoute.view === "settings" && initialRoute.subTab
      ? initialRoute.subTab
      : Object.keys(aria2GlobalAvailableOptions)[0],
  );

  const [downloadFilter, setDownloadFilter] = createSignal<
    "all" | "active" | "waiting" | "stopped"
  >(
    initialRoute.view === "downloads" && initialRoute.subTab
      ? (initialRoute.subTab as any)
      : "active"
  );

  const handleHashChange = () => {
    const route = parseHash(window.location.hash);
    
    // 1. Update view
    if (view() !== route.view) {
      setView(route.view);
    }
    
    // 2. Update activeSubTab
    if (route.view === "settings") {
      const defaultSub = Object.keys(aria2GlobalAvailableOptions)[0];
      const targetSub = route.subTab || defaultSub;
      if (activeSubTab() !== targetSub) {
        setActiveSubTab(targetSub);
      }
    }
    
    // 3. Update downloadFilter
    if (route.view === "downloads") {
      const targetFilter = route.subTab || "active";
      if (downloadFilter() !== targetFilter) {
        setDownloadFilter(targetFilter as any);
      }
    }
    
    // 4. Update task details
    const storeTaskId = aria2Store.getState().selectedTaskId;
    if (route.taskGid) {
      if (storeTaskId !== route.taskGid) {
        aria2Store.showTaskDetail(route.taskGid);
      }
    } else {
      if (storeTaskId !== null) {
        aria2Store.setSelectedTask(null);
      }
    }
  };

  onMount(async () => {
    await aria2Store.init();
    await aria2Store.fetchTasks();
    
    keyboardService.init();
    
    if (initialRoute.taskGid) {
      aria2Store.showTaskDetail(initialRoute.taskGid);
    }
    
    window.addEventListener("aria-web:add-task", () => {
      setView("downloads");
    });
    
    window.addEventListener("aria-web:open-settings", () => {
      setView("settings");
    });
    
    window.addEventListener("aria-web:open-status", () => {
      setView("status");
    });
    
    window.addEventListener("aria-web:refresh-tasks", async () => {
      await aria2Store.fetchTasks();
    });

    window.addEventListener("hashchange", handleHashChange);
  });

  onCleanup(() => {
    window.removeEventListener("hashchange", handleHashChange);
  });

  createEffect(() => {
    const theme = aria2Store.getState().appSettings.theme;
    let activeTheme = theme;
    if (theme === "system") {
      activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-theme", activeTheme);
  });

  // Dynamic document title update
  createEffect(() => {
    titleService.updateTitle();
    // Accessing globalStat here makes this effect track it
    aria2Store.getState().globalStat;
  });

  // Synchronize state -> URL hash
  createEffect(() => {
    const currentV = view();
    const subTab = currentV === "settings" 
      ? activeSubTab() 
      : currentV === "downloads" 
        ? downloadFilter() 
        : null;
    const taskGid = aria2Store.getState().selectedTaskId;
    
    const newHash = stringifyHash({
      view: currentV,
      subTab,
      taskGid,
    });
    
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
  });

  return (
    <>
      <TaskDetail />
      <Layout
        currentView={view()}
        setView={(v) => setView(v as any)}
        activeSubTab={activeSubTab()}
        setActiveSubTab={setActiveSubTab}
        settingsCategories={Object.keys(aria2GlobalAvailableOptions)}
      >
        {view() === "settings" ? (
          <ConnectionSettings
            activeSubTab={activeSubTab()}
            setActiveSubTab={setActiveSubTab}
          />
        ) : view() === "rpc-profiles" ? (
          <RpcProfileView onProfileSelected={() => setView("downloads")} />
        ) : view() === "app-settings" ? (
          <AppSettingsView />
        ) : view() === "status" ? (
          <StatusView />
        ) : view() === "ed2k" ? (
          <Ed2kSearch />
        ) : view() === "debug" ? (
          <DebugView />
        ) : (
          <div class="h-full">
            <TaskList filter={downloadFilter()} setFilter={setDownloadFilter} />
          </div>
        )}
      </Layout>
    </>
  );
};

export default App;
