import { type Component, For } from "solid-js";

interface HeaderProps {
  navItems: { label: any; view: string }[];
  currentView: string;
  setView: (view: string) => void;
}

const Header: Component<HeaderProps> = (props) => {
  return (
    <div class="navbar bg-base-100 border-b border-base-300 px-4">
      <div class="flex-1">
        {/* Title removed as it is now in the sidebar */}
      </div>
      <div class="flex-none">
        <ul class="menu menu-horizontal px-1">
          <For each={props.navItems}>
            {(item) => (
              <li>
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    props.setView(item.view);
                  }}
                  class={props.currentView === item.view ? "active" : ""}
                >
                  {typeof item.label === "function" ? item.label() : item.label}
                </a>
              </li>
            )}
          </For>
        </ul>
      </div>
    </div>
  );
};

export default Header;
