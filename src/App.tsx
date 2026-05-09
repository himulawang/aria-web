import { createSignal, onMount, createEffect, type Component } from "solid-js";
import Layout from "./components/Layout";
import ConnectionSettings from "./components/ConnectionSettings";
import AppSettingsView from "./components/AppSettingsView";
import RpcProfileView from "./components/RpcProfileView";
import StatusView from "./components/StatusView";
import TaskList from "./components/TaskList";
import TaskDetail from "./components/TaskDetail";
import AddTask from "./components/AddTask";
import { aria2Store } from "./store/aria2-store";
import { aria2GlobalAvailableOptions } from "./config/aria2-available-options";

const App: Component = () => {
  const [view, setView] = createSignal<
    "downloads" | "settings" | "status" | "app-settings" | "rpc-profiles"
  >("downloads");
  const [activeSubTab, setActiveSubTab] = createSignal<string | null>(
    Object.keys(aria2GlobalAvailableOptions)[0],
  );

  onMount(async () => {
    await aria2Store.init();
    await aria2Store.fetchTasks();
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

  return (
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
      ) : (
        <div class="flex flex-col h-full">
          <AddTask />
          <div class="flex flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto">
              <TaskList />
            </div>
            <div class="w-80 border-l border-base-300 overflow-y-auto">
              <TaskDetail />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
