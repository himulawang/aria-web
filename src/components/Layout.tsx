import { type Component, type JSX, createSignal, For } from "solid-js";
import { t } from "../i18n";
import Toast from "./Toast";
import ConnectionStatus from "./ConnectionStatus";
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
        <aside class="menu p-4 w-80 h-full bg-base-100 text-base-content border-r border-base-300 flex flex-col">
          <div class="px-4 py-2 text-xl font-bold mb-4">AriaWeb</div>
          <nav class="flex-1">
            <For each={navItems.filter((i) => i.position === "sidebar")}>
              {(item) =>
                item.view === "settings" ? (
                  <li>
                    <details open={isSettingsExpanded()} class="group">
                      <summary
                        onClick={(e) => {
                          e.preventDefault();
                          props.setView("settings");
                          setIsSettingsExpanded(!isSettingsExpanded());
                        }}
                        class={`cursor-pointer ${props.currentView === "settings" ? "active" : ""}`}
                      >
                        <item.icon class="w-5 h-5" />
                        {item.label()}
                      </summary>
                      <ul>
                        <For each={props.settingsCategories}>
                          {(category) => (
                            <li>
                              <a
                                onClick={(e) => {
                                  e.preventDefault();
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
                    </details>
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
                      {item.label()}
                    </a>
                  </li>
                )
              }
            </For>
          </nav>
          <div class="mt-auto pt-4 border-t border-base-300">
            <ConnectionStatus />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Layout;
