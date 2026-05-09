import { type Component, type JSX, createSignal, For, Show } from "solid-js";
import { t } from "../i18n";
import Toast from "./Toast";
import ConnectionStatus, { SpeedSummary } from "./ConnectionStatus";
import {
  HiOutlineArrowDownTray,
  HiOutlineCog6Tooth,
  HiOutlineCommandLine,
  HiOutlineIdentification,
  HiOutlineChartBar,
} from "solid-icons/hi";

interface LayoutProps {
  children: JSX.Element;
  currentView: string;
  setView: (view: string) => void;
  activeSubTab: string | null;
  setActiveSubTab: (tab: string | null) => void;
  settingsCategories: string[];
}

const Layout: Component<LayoutProps> = (props) => {
  const [isSettingsExpanded, setIsSettingsExpanded] = createSignal(true);
  const [isCollapsed, setIsCollapsed] = createSignal(false);
  const [isPopoverOpen, setIsPopoverOpen] = createSignal(false);

  const navItems = [
    {
      label: t("nav.downloads"),
      view: "downloads",
      position: "sidebar",
      icon: HiOutlineArrowDownTray,
    },
    {
      label: t("nav.rpcProfiles"),
      view: "rpc-profiles",
      position: "sidebar",
      icon: HiOutlineIdentification,
    },
    {
      label: t("nav.appSettings"),
      view: "app-settings",
      position: "sidebar",
      icon: HiOutlineCog6Tooth,
    },
    {
      label: t("nav.settings"),
      view: "settings",
      position: "sidebar",
      icon: HiOutlineCommandLine,
    },
    {
      label: t("nav.status"),
      view: "status",
      position: "sidebar",
      icon: HiOutlineChartBar,
    },
  ];

  return (
    <div class="drawer lg:drawer-open h-screen overflow-hidden bg-base-200">
      <input id="my-drawer" type="checkbox" class="drawer-toggle" />
      <div class="drawer-content flex flex-col h-full overflow-hidden">
        <main class="flex-1 overflow-hidden relative">
          <Toast />
          <div class="h-full p-4">{props.children}</div>
        </main>
      </div>
      <div class="drawer-side">
        <label htmlFor="my-drawer" class="drawer-overlay"></label>
        <aside
          class={`menu p-4 h-full bg-base-100 text-base-content border-r border-base-300 flex flex-col transition-all duration-300 ${isCollapsed() ? "w-16" : "w-64"}`}
        >
          <div class="flex items-center justify-between mb-4">
            <div
              class={`px-2 py-2 text-xl font-bold ${isCollapsed() ? "hidden" : "block"}`}
            >
              AriaWeb
            </div>
            <button
              class="btn btn-ghost btn-xs"
              onClick={() => setIsCollapsed(!isCollapsed())}
            >
              {isCollapsed() ? ">" : "<"}
            </button>
          </div>
          <nav class="flex-1">
            <For each={navItems.filter((i) => i.position === "sidebar")}>
              {(item) =>
                item.view === "settings" ? (
                  <li class="relative">
                    <button
                      onClick={() => {
                        console.log("DEBUG: Button Clicked");
                        if (isCollapsed()) {
                          setIsPopoverOpen(!isPopoverOpen());
                        } else {
                          setIsSettingsExpanded(!isSettingsExpanded());
                          props.setView("settings");
                        }
                      }}
                      class={`w-full flex items-center ${!isCollapsed() && props.currentView === "settings" ? "active" : ""}`}
                    >
                      <item.icon class="w-5 h-5" />
                      <span class={isCollapsed() ? "hidden" : "block"}>
                        {item.label()}
                      </span>
                    </button>
                    {/* Popover */}
                    <Portal>
                      <Show when={isCollapsed() && isPopoverOpen()}>
                        <div class="fixed left-16 top-20 z-[9999] w-48 bg-base-100 shadow-2xl border border-base-300 rounded-lg py-2">
                          <For each={props.settingsCategories}>
                            {(category) => (
                              <a
                                class="block px-4 py-2 hover:bg-base-200 cursor-pointer text-sm"
                                onClick={() => {
                                  props.setActiveSubTab(category);
                                  props.setView("settings");
                                  setIsPopoverOpen(false);
                                }}
                              >
                                {t(`nav.settings.${category}`)() || category}
                              </a>
                            )}
                          </For>
                        </div>
                      </Show>
                    </Portal>
                    {/* Normal list for expanded */}
                    {!isCollapsed() && (
                      <ul class={isSettingsExpanded() ? "block" : "hidden"}>
                        <For each={props.settingsCategories}>
                          {(category) => (
                            <li>
                              <a
                                onClick={() => {
                                  props.setActiveSubTab(category);
                                  props.setView("settings");
                                }}
                                class={
                                  props.activeSubTab === category
                                    ? "active"
                                    : ""
                                }
                              >
                                {t(`nav.settings.${category}`)() || category}
                              </a>
                            </li>
                          )}
                        </For>
                      </ul>
                    )}
                  </li>
                ) : (
                  <li>
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        props.setView(item.view);
                      }}
                      class={props.currentView === item.view ? "active" : ""}
                    >
                      <item.icon class="w-5 h-5" />
                      <span class={isCollapsed() ? "hidden" : "block"}>
                        {item.label()}
                      </span>
                    </a>
                  </li>
                )
              }
            </For>
          </nav>
          <div class="mt-auto pt-4 border-t border-base-300 flex flex-col gap-3">
            <SpeedSummary isCollapsed={isCollapsed()} />
            <ConnectionStatus isCollapsed={isCollapsed()} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Layout;
