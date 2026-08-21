import { type Component, createMemo, Show, onMount, createEffect } from "solid-js";
import { formatSize } from "../../utils/format";
import { t } from "../../i18n";

interface TaskPieceMapProps {
  bitfield?: string;
  numPieces?: number | string;
  pieceLength?: number | string;
}

export const TaskPieceMap: Component<TaskPieceMapProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;

  const totalPieces = () => Number(props.numPieces || 0);
  const pieceSize = () => Number(props.pieceLength || 0);

  // Decode hex bitfield into boolean array
  const pieces = createMemo<boolean[]>(() => {
    const bf = props.bitfield;
    const total = totalPieces();
    if (!bf || total === 0) return [];

    const result: boolean[] = [];
    for (let i = 0; i < bf.length && result.length < total; i++) {
      const val = parseInt(bf[i], 16);
      if (!isNaN(val)) {
        result.push((val & 8) !== 0);
        if (result.length < total) result.push((val & 4) !== 0);
        if (result.length < total) result.push((val & 2) !== 0);
        if (result.length < total) result.push((val & 1) !== 0);
      }
    }
    return result.slice(0, total);
  });

  const completedCount = createMemo(() => {
    return pieces().filter(Boolean).length;
  });

  const drawPieceCanvas = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;

    const data = pieces();
    if (data.length === 0) return;

    const width = canvasRef.width;
    const height = canvasRef.height;

    ctx.clearRect(0, 0, width, height);

    // Calculate grid layout
    const cols = Math.min(data.length, Math.max(20, Math.floor(Math.sqrt(data.length * (width / height)))));
    const rows = Math.ceil(data.length / cols);

    const cellWidth = width / cols;
    const cellHeight = height / rows;
    const gap = cellWidth > 4 && cellHeight > 4 ? 1 : 0;

    for (let i = 0; i < data.length; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;

      const x = c * cellWidth;
      const y = r * cellHeight;
      const w = Math.max(1, cellWidth - gap);
      const h = Math.max(1, cellHeight - gap);

      if (data[i]) {
        ctx.fillStyle = "#10b981"; // completed (emerald green)
      } else {
        ctx.fillStyle = "rgba(150, 150, 150, 0.2)"; // uncompleted
      }

      ctx.fillRect(x, y, w, h);
    }
  };

  createEffect(() => {
    pieces();
    drawPieceCanvas();
  });

  onMount(() => {
    const handleResize = () => {
      if (canvasRef && canvasRef.parentElement) {
        const rect = canvasRef.parentElement.getBoundingClientRect();
        canvasRef.width = rect.width * (window.devicePixelRatio || 1);
        canvasRef.height = 60 * (window.devicePixelRatio || 1);
        drawPieceCanvas();
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();
  });

  return (
    <Show when={totalPieces() > 0 && props.bitfield}>
      <div class="card bg-base-200/30 border border-base-300/60 rounded-xl overflow-hidden p-4 space-y-2 mt-4">
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-base-content/80">
            {t("task-detail.pieceMap")() || "分片完成度矩阵 (Piece Map)"}
          </span>
          <div class="flex items-center gap-3 text-base-content/60 font-mono">
            <span>
              {completedCount()} / {totalPieces()} 分片
            </span>
            <Show when={pieceSize() > 0}>
              <span>(单片: {formatSize(pieceSize())})</span>
            </Show>
          </div>
        </div>

        {/* Piece Canvas Matrix */}
        <div class="w-full h-[60px] rounded bg-base-300/30 overflow-hidden relative">
          <canvas ref={canvasRef} class="w-full h-full block" />
        </div>
      </div>
    </Show>
  );
};

export default TaskPieceMap;
