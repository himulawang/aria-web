import { type Component, createSignal, For, Show } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import "./styles/rpc-profile-view.css";

interface RpcProfileViewProps {
  onProfileSelected: (id: string) => void;
}

const RpcProfileView: Component<RpcProfileViewProps> = (props) => {
  const state = aria2Store.getState();
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [form, setForm] = createSignal({
    name: "",
    url: "",
    token: "",
    useWebSocket: true,
  });

  const handleSave = async () => {
    if (editingId()) {
      const profile = state.rpcProfiles.find((p) => p.id === editingId());
      await aria2Store.updateProfile(editingId()!, {
        name: form().name,
        config: {
          ...profile?.config,
          url: form().url,
          token: form().token,
          useWebSocket: form().useWebSocket,
        },
      });
    } else {
      await aria2Store.addProfile({
        id: Date.now().toString(),
        name: form().name,
        config: {
          url: form().url,
          token: form().token,
          useWebSocket: form().useWebSocket,
          httpMethod: "POST",
          wsReconnectInterval: 5000,
        },
      });
    }
    setEditingId(null);
    setForm({ name: "", url: "", token: "", useWebSocket: true });
  };

  const startEdit = (profile: any) => {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      url: profile.config.url,
      token: profile.config.token,
      useWebSocket: profile.config.useWebSocket,
    });
  };

  return (
    <div class="rpc-profile-container">
      <h2 class="rpc-profile-title">{t("rpc-profile.title")()}</h2>

      <div class="profile-form">
        <h3>
          {editingId() ? t("rpc-profile.edit")() : t("rpc-profile.add")()}
        </h3>
        <div class="profile-input-group">
          <label>{t("rpc-profile.name")()}</label>
          <input
            type="text"
            value={form().name}
            onInput={(e) => setForm({ ...form(), name: e.currentTarget.value })}
          />
        </div>
        <div class="profile-input-group">
          <label>{t("rpc-profile.url")()}</label>
          <input
            type="text"
            value={form().url}
            onInput={(e) => setForm({ ...form(), url: e.currentTarget.value })}
          />
        </div>
        <div class="profile-input-group">
          <label>{t("rpc-profile.token")()}</label>
          <input
            type="text"
            value={form().token}
            onInput={(e) =>
              setForm({ ...form(), token: e.currentTarget.value })
            }
          />
        </div>
        <div class="profile-input-group">
          <label>{t("rpc-profile.websocket")()}</label>
          <input
            type="checkbox"
            checked={form().useWebSocket}
            onChange={(e) =>
              setForm({ ...form(), useWebSocket: e.currentTarget.checked })
            }
          />
        </div>
        <button class="btn btn-success" onClick={handleSave}>
          {t("rpc-profile.save")()}
        </button>
      </div>

      <div class="profile-list">
        <h3>{t("rpc-profile.saved")()}</h3>
        <For each={state.rpcProfiles}>
          {(profile) => (
            <div
              class={`profile-item ${state.currentProfileId === profile.id ? "active" : ""}`}
            >
              <div
                class="profile-info"
                onClick={() => {
                  props.onProfileSelected(profile.id);
                  aria2Store.setCurrentProfile(profile.id);
                }}
              >
                <strong>{profile.name}</strong>
                <span>{profile.config.url}</span>
              </div>
              <div class="profile-actions">
                <button onClick={() => startEdit(profile)}>
                  {t("common.edit")()}
                </button>
                <button onClick={() => aria2Store.removeProfile(profile.id)}>
                  {t("common.delete")()}
                </button>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default RpcProfileView;
