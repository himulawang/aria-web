import { type Component, For } from "solid-js";

interface HeaderProps {
    navItems: { label: string; view: string }[];
    currentView: string;
    setView: (view: string) => void;
}

const Header: Component<HeaderProps> = (props) => {
    return (
        <header>
            <div class="header-container">
                <span class="brand">AriaWeb</span>
                <nav>
                    <ul class="nav-menu">
                        <For each={props.navItems}>
                            {(item) => (
                                <li>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            props.setView(item.view);
                                        }}
                                        class={
                                            props.currentView === item.view
                                                ? "active"
                                                : ""
                                        }
                                    >
                                        {item.label}
                                    </a>
                                </li>
                            )}
                        </For>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header;
