import { type Component, type JSX, createSignal, For } from "solid-js";
import { t } from "../i18n";
import Header from "./layout/Header";
import Footer from "./layout/Footer";
import Toast from "./Toast";
import "./styles/layout.css";

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
    { label: t("nav.downloads"), view: "downloads", position: "sidebar" },
    { label: t("nav.rpcProfiles"), view: "rpc-profiles", position: "sidebar" },
    { label: t("nav.appSettings"), view: "app-settings", position: "sidebar" },
    { label: t("nav.settings"), view: "settings", position: "sidebar" },
    { label: t("nav.status"), view: "status", position: "sidebar" },
  ];

  return (
    <div class="layout-container">
      <Toast />
      <Header
        navItems={navItems.filter((i) => i.position === "header")}
        currentView={props.currentView}
        setView={props.setView}
      />
      <div class="layout-main-wrapper">
        <aside class="layout-sidebar">
          <nav class="layout-nav">
            <For each={navItems.filter((i) => i.position === "sidebar")}>
              {(item) =>
                item.view === "settings" ? (
                  <div class="layout-nav-item">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        props.setView("settings");
                        setIsSettingsExpanded(!isSettingsExpanded());
                      }}
                      class={`layout-nav-link ${props.currentView === "settings" ? "layout-nav-link-active" : "layout-nav-link-inactive"}`}
                    >
                      {item.label()} {isSettingsExpanded() ? "▼" : "▶"}
                    </a>
                    {isSettingsExpanded() && (
                      <div class="layout-nav-sub">
                        <For each={props.settingsCategories}>
                          {(category) => (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                props.setActiveSubTab(category);
                                props.setView("settings");
                              }}
                              class={`layout-nav-sub-item ${props.activeSubTab === category ? "active" : ""}`}
                            >
                              {t(`nav.settings.${category}`)() || category}
                            </a>
                          )}
                        </For>
                      </div>
                    )}
                  </div>
                ) : (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      props.setView(item.view);
                    }}
                    class={`layout-nav-link ${props.currentView === item.view ? "layout-nav-link-active" : "layout-nav-link-inactive"}`}
                  >
                    {item.label()}
                  </a>
                )
              }
            </For>
          </nav>
        </aside>
        <main class="layout-content">{props.children}</main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
