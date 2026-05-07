import { createSignal, type Component } from "solid-js";
import { aria2Store } from "../store";
import "./styles/add-task.css";

const AddTask: Component = () => {
    const [url, setUrl] = createSignal("");

    const handleAdd = async () => {
        if (!url()) return;
        try {
            await aria2Store.addTask([url()]);
            setUrl("");
            alert("Task added successfully!");
        } catch (e) {
            alert("Failed to add task: " + e);
        }
    };

    return (
        <div class="add-task-container">
            <input
                type="text"
                placeholder="Enter URL"
                value={url()}
                onInput={(e) => setUrl(e.currentTarget.value)}
                class="add-task-input"
            />
            <button onClick={handleAdd} class="add-task-button">
                Add
            </button>
        </div>
    );
};

export default AddTask;
