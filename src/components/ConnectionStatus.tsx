import { createMemo, type Component } from "solid-js";
import { aria2Store } from "../store";
import "./styles/connection-status.css";

const ConnectionStatus: Component = () => {
    const state = aria2Store.getState();

    const statusInfo = createMemo(() => {
        switch (state.connectionStatus) {
            case "connected":
                return { text: "Connected", color: "#4caf50" };
            case "connecting":
                return { text: "Connecting...", color: "#ff9800" };
            case "error":
                return { text: "Connection Error", color: "#f44336" };
            default:
                return { text: "Disconnected", color: "#9e9e9e" };
        }
    });

    return (
        <div class="connection-status-container">
            <div
                class="connection-status-dot"
                style={{ "background-color": statusInfo().color }}
            />
            <span class="connection-status-text">{statusInfo().text}</span>
        </div>
    );
};

export default ConnectionStatus;
