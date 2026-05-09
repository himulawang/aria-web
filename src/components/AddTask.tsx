import { createSignal, type Component } from "solid-js";
import { aria2Store } from "../store";

const AddTask: Component = () => {
  const [url, setUrl] = createSignal("");

  const handleAdd = async () => {
    if (!url()) return;
    try {
      await aria2Store.addTask([url()]);
      setUrl("");
      // Using a simple alert for now, will replace with Toast in next step
      alert("Task added successfully!");
    } catch (e) {
      alert("Failed to add task: " + e);
    }
  };

  return (
    <div class="flex gap-2 p-4 bg-base-100 rounded-box border border-base-300 mb-4">
      <input
        type="text"
        placeholder="Enter URL"
        value={url()}
        onInput={(e) => setUrl(e.currentTarget.value)}
        class="input input-bordered flex-1"
      />
      <button onClick={handleAdd} class="btn btn-primary">
        Add
      </button>
    </div>
  );
};

export default AddTask;
