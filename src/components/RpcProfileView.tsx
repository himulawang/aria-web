import { type Component, createSignal, For, Show } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";

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
    <div class="h-full flex flex-col overflow-hidden">
      <div class="flex items-center justify-between mb-6 shrink-0">
        <h2 class="text-2xl font-bold">{t("rpc-profile.title")()}</h2>
      </div>

      <div class="flex-1 overflow-y-auto pr-2">
        <div class="max-w-4xl mx-auto space-y-8">
          <div class="card bg-base-100 shadow-sm border border-base-300">
            <div class="card-body">
              <h3 class="card-title text-lg mb-4">
                {editingId() ? t("rpc-profile.edit")() : t("rpc-profile.add")()}
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control w-full">
                  <label class="label">
                    <span class="label-text">{t("rpc-profile.name")()}</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered w-full"
                    value={form().name}
                    onInput={(e) =>
                      setForm({ ...form(), name: e.currentTarget.value })
                    }
                  />
                </div>
                <div class="form-control w-full">
                  <label class="label">
                    <span class="label-text">{t("rpc-profile.url")()}</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered w-full"
                    value={form().url}
                    onInput={(e) =>
                      setForm({ ...form(), url: e.currentTarget.value })
                    }
                  />
                </div>
                <div class="form-control w-full">
                  <label class="label">
                    <span class="label-text">{t("rpc-profile.token")()}</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered w-full"
                    value={form().token}
                    onInput={(e) =>
                      setForm({ ...form(), token: e.currentTarget.value })
                    }
                  />
                </div>
                <div class="form-control w-full">
                  <label class="label cursor-pointer flex justify-start gap-4">
                    <span class="label-text">
                      {t("rpc-profile.websocket")()}
                    </span>
                    <input
                      type="checkbox"
                      class="toggle toggle-primary"
                      checked={form().useWebSocket}
                      onChange={(e) =>
                        setForm({
                          ...form(),
                          useWebSocket: e.currentTarget.checked,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <div class="card-actions justify-end mt-6">
                <button class="btn btn-primary" onClick={handleSave}>
                  {t("rpc-profile.save")()}
                </button>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm border border-base-300">
            <div class="card-body">
              <h3 class="card-title text-lg mb-4">
                {t("rpc-profile.saved")()}
              </h3>
              <div class="overflow-x-auto">
                <table class="table w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>URL</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={state.rpcProfiles}>
                      {(profile) => (
                        <tr
                          class={`hover ${
                            state.currentProfileId === profile.id
                              ? "bg-base-200"
                              : ""
                          }`}
                        >
                          <td class="font-bold">{profile.name}</td>
                          <td class="text-sm opacity-70">
                            {profile.config.url}
                          </td>
                          <td class="text-right space-x-2">
                            <button
                              class="btn btn-ghost btn-xs"
                              onClick={() => startEdit(profile)}
                            >
                              {t("common.edit")()}
                            </button>
                            <button
                              class="btn btn-ghost btn-xs text-error"
                              onClick={() =>
                                aria2Store.removeProfile(profile.id)
                              }
                            >
                              {t("common.delete")()}
                            </button>
                            <button
                              class="btn btn-sm btn-primary"
                              onClick={() => {
                                props.onProfileSelected(profile.id);
                                aria2Store.setCurrentProfile(profile.id);
                              }}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RpcProfileView;
