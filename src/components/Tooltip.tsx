import { createSignal, onCleanup, type Component, Show, createMemo } from "solid-js";
import { Portal } from "solid-js/web";

interface TooltipProps {
    text: string;
    target: HTMLElement;
}

export const Tooltip: Component<TooltipProps> = (props) => {
    const [pos, setPos] = createSignal({ top: 0, left: 0 });

    const updatePos = () => {
        const rect = props.target.getBoundingClientRect();
        setPos({
            top: rect.top + window.scrollY - 30,
            left: rect.left + window.scrollX + 10,
        });
    };

    onMount(() => {
        updatePos();
        window.addEventListener("scroll", updatePos);
    });

    onCleanup(() => window.removeEventListener("scroll", updatePos));

    return (
        <Portal>
            <div
                class="global-tooltip"
                style={{
                    top: `${pos().top}px`,
                    left: `${pos().left}px`,
                    position: "absolute",
                    "z-index": 99999,
                }}
            >
                {props.text}
            </div>
        </Portal>
    );
};
