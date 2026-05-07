import {
    createSignal,
    onMount,
    type Component,
    createResource,
    Show,
    For,
} from "solid-js";
import { aria2Store } from "../store";
import "./styles/connection-settings.css";

const StatusView: Component = () => {
    const state = aria2Store.getState();
    const [serverInfo, { refetch }] = createResource(
        () => state.connectionStatus,
        async (status) => {
            if (status === "connected") {
                return await aria2Store.getServerInfo();
            }
            return null;
        },
    );

    return (
        <div class="connection-settings-container">
            <div class="connection-settings-content">
                <h2>Aria2 Status</h2>
                <div class="connection-settings-group">
                    <label>Aria2 RPC Address</label>
                    <input
                        type="text"
                        value={state.config.url}
                        disabled
                        class="connection-settings-input"
                    />
                </div>
                <div class="connection-settings-group">
                    <label>Aria2 Status</label>
                    <div
                        class={`label ${
                            state.connectionStatus === "connected"
                                ? "label-success"
                                : "label-danger"
                        }`}
                    >
                        {state.connectionStatus}
                    </div>
                </div>
                <div class="connection-settings-group">
                    <label>Aria2 Version</label>
                    <Show
                        when={!serverInfo.loading}
                        fallback={<span>Loading...</span>}
                    >
                        <span>{serverInfo()?.version || "-"}</span>
                    </Show>
                </div>
                <div class="connection-settings-group">
                    <label>Enabled Features</label>
                    <Show
                        when={!serverInfo.loading}
                        fallback={<span>Loading...</span>}
                    >
                        <For each={serverInfo()?.enabledFeatures || []}>
                            {(feature) => (
                                <div>
                                    <input type="checkbox" checked disabled />{" "}
                                    {feature}
                                </div>
                            )}
                        </For>
                    </Show>
                </div>
                <div class="connection-settings-buttons">
                    <button
                        onClick={() => aria2Store.saveSession()}
                        class="connection-settings-btn-success"
                    >
                        Save Session
                    </button>
                    <button
                        onClick={async () => {
                            await aria2Store.shutdown();
                            refetch();
                        }}
                        class="connection-settings-btn-secondary"
                    >
                        Shutdown Aria2
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatusView;
