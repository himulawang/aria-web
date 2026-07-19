import { For, type Component } from "solid-js";
import { notificationStore } from "../store/notification-store";

const Toast: Component = () => {
  return (
    <div
      class="toast toast-end z-50 max-h-[50vh] overflow-y-auto flex flex-col-reverse no-scrollbar"
      style={{
        "scrollbar-width": "none",
        "-ms-overflow-style": "none",
      }}
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <For each={[...notificationStore.notifications].reverse()}>
        {(n) => (
          <div
            class={`alert ${
              n.type === "success"
                ? "alert-success"
                : n.type === "error"
                  ? "alert-error"
                  : "alert-info"
            } shadow-lg mb-2 max-w-md w-full`}
          >
            <div class="toast-content min-w-0 flex-1">
              {n.title && <div class="toast-title font-bold">{n.title}</div>}
              <div class="text-sm whitespace-pre-wrap break-all">{n.message}</div>
            </div>
            <button
              class="btn btn-ghost btn-xs flex-shrink-0"
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

