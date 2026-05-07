import { For, type Component } from "solid-js";
import { notificationStore } from "../store/notification-store";
import "./styles/toast.css";

const Toast: Component = () => {
    return (
        <div class="toast-container">
            <For each={notificationStore.notifications}>
                {(n) => (
                    <div class={`toast toast-${n.type}`}>
                        {n.message}
                        <button onClick={() => notificationStore.remove(n.id)}>
                            ×
                        </button>
                    </div>
                )}
            </For>
        </div>
    );
};

export default Toast;
