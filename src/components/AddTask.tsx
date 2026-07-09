import { createSignal, Show, type Component } from "solid-js";
import { aria2Store } from "../store";
import { t } from "../i18n";
import { notificationStore } from "../store/notification-store";

interface AddTaskProps {
  onClose: () => void;
}

const AddTask: Component<AddTaskProps> = (props) => {
  const [tab, setTab] = createSignal<"urls" | "file">("urls");
  const [urls, setUrls] = createSignal("");
  const [file, setFile] = createSignal<{
    name: string;
    content: string;
    type: "torrent" | "metalink";
  } | null>(null);
  const [options, setOptions] = createSignal<Record<string, any>>({});
  const [showAdvanced, setShowAdvanced] = createSignal(false);

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const fileObj = input.files[0];
      const fileName = fileObj.name.toLowerCase();
      let type: "torrent" | "metalink" = "torrent";

      if (fileName.endsWith(".metalink") || fileName.endsWith(".meta4")) {
        type = "metalink";
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        setFile({ name: fileObj.name, content: base64, type });
      };
      reader.readAsDataURL(fileObj);
    }
  };

  const updateOption = (key: string, value: string) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleStart = async (pause: boolean) => {
    const finalOptions = { ...options(), pause: pause ? "true" : "false" };

    try {
      if (tab() === "urls") {
        const urlsArray = urls()
          .split("\n")
          .filter((u) => u.trim() !== "");
        await aria2Store.addTask(urlsArray, finalOptions);
      } else if (tab() === "file" && file()) {
        if (file()!.type === "torrent") {
          await aria2Store.addTorrentTask(file()!.content, finalOptions);
        } else {
          await aria2Store.addMetalinkTask(file()!.content, finalOptions);
        }
      }
      notificationStore.add(t("new-task.add-success")(), "success");
      props.onClose();
    } catch (e) {
      console.error("Task submission error:", e);
      notificationStore.add(t("new-task.add-failed")() + ": " + e, "error");
      props.onClose();
    }
  };

  return (
    <div class="flex flex-col gap-4">
      <div class="tabs tabs-bordered">
        <button
          class={`tab ${tab() === "urls" ? "tab-active" : ""}`}
          onClick={() => setTab("urls")}
        >
          {t("new-task.links")()}
        </button>
        <button
          class={`tab ${tab() === "file" ? "tab-active" : ""}`}
          onClick={() => setTab("file")}
        >
          {t("new-task.file")()}
        </button>
      </div>

      <div class="p-2">
        <Show when={tab() === "urls"}>
          <textarea
            class="textarea textarea-bordered w-full h-32"
            placeholder={t("new-task.placeholder-urls")()}
            value={urls()}
            onInput={(e) => setUrls(e.currentTarget.value)}
          />
        </Show>

        <Show when={tab() === "file"}>
          <div class="flex flex-col gap-2">
            <input
              type="file"
              class="textarea textarea-bordered w-full"
              onChange={handleFileChange}
              accept=".torrent,.metalink,.meta4"
            />
            {file() && (
              <div class="text-sm badge badge-ghost">
                {file()?.name} {file()?.type === "metalink" ? " (Metalink)" : " (Torrent)"}
              </div>
            )}
          </div>
        </Show>
      </div>

      <div class="p-2 bg-base-200 rounded-lg flex flex-col gap-2">
        <button 
          class="btn btn-ghost btn-sm justify-start gap-2" 
          onClick={() => setShowAdvanced(!showAdvanced())}
        >
          <span class={`transition-transform ${showAdvanced() ? "rotate-90" : ""}`}>▶</span>
          {t("new-task.advanced-settings")()}
        </button>
        <Show when={showAdvanced()}>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
            <div class="form-control">
              <label class="label">
                <span class="label-text">{t("new-task.option.dir")()}</span>
              </label>
              <input 
                type="text" 
                class="input input-bordered input-sm" 
                placeholder="/home/aria2/downloads"
                onInput={(e) => updateOption("dir", e.currentTarget.value)}
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">{t("new-task.option.out")()}</span>
              </label>
              <input 
                type="text" 
                class="input input-bordered input-sm" 
                placeholder="filename"
                onInput={(e) => updateOption("out", e.currentTarget.value)}
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">{t("new-task.option.split")()}</span>
              </label>
              <input 
                type="number" 
                class="input input-bordered input-sm" 
                placeholder="5"
                onInput={(e) => updateOption("split", e.currentTarget.value)}
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">{t("new-task.option.user-agent")()}</span>
              </label>
              <input 
                type="text" 
                class="input input-bordered input-sm" 
                placeholder="aria2/1.36.0"
                onInput={(e) => updateOption("user-agent", e.currentTarget.value)}
              />
            </div>
            <div class="form-control col-span-full">
              <label class="label">
                <span class="label-text">{t("new-task.option.header")()}</span>
              </label>
              <textarea 
                class="textarea textarea-bordered" 
                placeholder="Cookie: ...\nUser-Agent: ..."
                onInput={(e) => updateOption("header", e.currentTarget.value)}
              />
            </div>
          </div>
        </Show>
      </div>

      <div class="modal-action">
        <button class="btn btn-primary" onClick={() => handleStart(false)}>
          {t("new-task.download-now")()}
        </button>
        <div class="dropdown dropdown-top dropdown-end">
          <label tabindex="0" class="btn btn-ghost">
            ▼
          </label>
          <ul
            tabindex="0"
            class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li>
              <a onClick={() => handleStart(true)}>
                {t("new-task.download-later")()}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AddTask;
