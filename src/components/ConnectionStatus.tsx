import { createMemo, type Component } from "solid-js";
import { aria2Store } from "../store";

const ConnectionStatus: Component = () => {
  const state = aria2Store.getState();

  const statusInfo = createMemo(() => {
    switch (state.connectionStatus) {
      case "connected":
        return { text: "Connected", color: "badge-success" };
      case "connecting":
        return { text: "Connecting...", color: "badge-warning" };
      case "error":
        return { text: "Connection Error", color: "badge-error" };
      default:
        return { text: "Disconnected", color: "badge-ghost" };
    }
  });

  return (
    <div class="flex items-center gap-2 px-2 py-1 rounded-full bg-base-200">
      <div
        class={`w-2 h-2 rounded-full ${
          state.connectionStatus === "connected"
            ? "bg-success"
            : state.connectionStatus === "connecting"
              ? "bg-warning"
              : state.connectionStatus === "error"
                ? "bg-error"
                : "bg-base-content/30"
        }`}
      />
      <span class="text-xs font-medium opacity-80">{statusInfo().text}</span>
    </div>
  );
};

export default ConnectionStatus;
