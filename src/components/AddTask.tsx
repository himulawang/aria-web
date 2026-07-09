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
              class="file-input file-input-bordered w-full"
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
