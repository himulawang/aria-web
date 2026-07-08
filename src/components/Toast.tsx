import { For, type Component } from "solid-js";
import { notificationStore } from "../store/notification-store";

const Toast: Component = () => {
  return (
    <div class="toast toast-end z-50">
      <For each={notificationStore.notifications}>
        {(n) => (
          <div
            class={`alert ${
              n.type === "success"
                ? "alert-success"
                : n.type === "error"
                  ? "alert-error"
                  : "alert-info"
            } shadow-lg mb-2`}
          >
            <div class="toast-content">
              {n.title && <div class="toast-title font-bold">{n.title}</div>}
              <span class="text-sm">{n.message}</span>
            </div>
            <button
              class="btn btn-ghost btn-xs"
              onClick={() => notificationStore.remove(n.id)}
            >
              ✕
            </button>
          </div>
        )}
      </For>
    </div>
  );
};

export default Toast;
