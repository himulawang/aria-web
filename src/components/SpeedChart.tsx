import { type Component, createSignal, onMount, onCleanup } from "solid-js";
import { aria2Store } from "../store";
import { formatSpeed } from "../utils/format";
import { t } from "../i18n";
import { HiOutlineArrowDownTray, HiOutlineArrowUpTray } from "solid-icons/hi";

const MAX_POINTS = 60; // 60 seconds history

export const SpeedChart: Component = () => {
  const state = aria2Store.getState();
  let canvasRef: HTMLCanvasElement | undefined;

  const [downHistory, setDownHistory] = createSignal<number[]>(new Array(MAX_POINTS).fill(0));
  const [upHistory, setUpHistory] = createSignal<number[]>(new Array(MAX_POINTS).fill(0));
  const [maxDown, setMaxDown] = createSignal(0);
  const [maxUp, setMaxUp] = createSignal(0);

  let intervalTimer: any = null;

  const tick = () => {
    const currentDown = Number(state.globalStat?.downloadSpeed || 0);
    const currentUp = Number(state.globalStat?.uploadSpeed || 0);

    setDownHistory((prev) => {
      const next = [...prev.slice(1), currentDown];
      const peak = Math.max(...next);
      if (peak > maxDown()) setMaxDown(peak);
      return next;
    });

    setUpHistory((prev) => {
      const next = [...prev.slice(1), currentUp];
      const peak = Math.max(...next);
      if (peak > maxUp()) setMaxUp(peak);
      return next;
    });

    drawChart();
  };

  const drawChart = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;

    const width = canvasRef.width;
    const height = canvasRef.height;

    ctx.clearRect(0, 0, width, height);

    const down = downHistory();
    const up = upHistory();

    const maxSpeed = Math.max(1024 * 1024, ...down, ...up); // at least 1MB/s scale

    // Background Grid
    ctx.strokeStyle = "rgba(150, 150, 150, 0.12)";
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 1; i <= gridLines; i++) {
      const y = (height / (gridLines + 1)) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Helper to draw filled line
    const drawLine = (data: number[], strokeColor: string, fillColor: string) => {
      if (data.length === 0) return;
      const step = width / (data.length - 1);

      ctx.beginPath();
      ctx.moveTo(0, height - (data[0] / maxSpeed) * (height - 10));

      for (let i = 1; i < data.length; i++) {
        const x = i * step;
        const y = height - (data[i] / maxSpeed) * (height - 10);
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Area fill
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    };

    // Draw Upload (Secondary / Purple)
    drawLine(up, "#a855f7", "rgba(168, 85, 247, 0.12)");

    // Draw Download (Primary / Green-Emerald)
    drawLine(down, "#10b981", "rgba(16, 185, 129, 0.18)");
  };

  onMount(() => {
    intervalTimer = setInterval(tick, 1000);
    drawChart();

    const handleResize = () => {
      if (canvasRef && canvasRef.parentElement) {
        const rect = canvasRef.parentElement.getBoundingClientRect();
        canvasRef.width = rect.width * (window.devicePixelRatio || 1);
        canvasRef.height = 140 * (window.devicePixelRatio || 1);
        drawChart();
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    onCleanup(() => {
      if (intervalTimer) clearInterval(intervalTimer);
      window.removeEventListener("resize", handleResize);
    });
  });

  const currentDownSpeed = () => Number(state.globalStat?.downloadSpeed || 0);
  const currentUpSpeed = () => Number(state.globalStat?.uploadSpeed || 0);

  return (
    <div class="card bg-base-100 shadow-sm border border-base-300">
      <div class="card-body p-4 sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <h3 class="card-title text-base">
              {t("status.speedChartTitle")() || "实时带宽与速度走势 (Real-time Bandwidth)"}
            </h3>
            <p class="text-xs text-base-content/70">
              {t("status.speedChartDesc")() || "近 60 秒上下行网络传输走势"}
            </p>
          </div>

          <div class="flex items-center gap-4">
            {/* Download stat */}
            <div class="flex items-center gap-1.5 text-xs font-mono">
              <HiOutlineArrowDownTray class="w-4 h-4 text-emerald-500" />
              <span class="text-emerald-500 font-bold">{formatSpeed(currentDownSpeed())}</span>
              <span class="text-base-content/50 text-[10px]">
                (峰值: {formatSpeed(maxDown())})
              </span>
            </div>

            {/* Upload stat */}
            <div class="flex items-center gap-1.5 text-xs font-mono">
              <HiOutlineArrowUpTray class="w-4 h-4 text-purple-500" />
              <span class="text-purple-500 font-bold">{formatSpeed(currentUpSpeed())}</span>
              <span class="text-base-content/50 text-[10px]">
                (峰值: {formatSpeed(maxUp())})
              </span>
            </div>
          </div>
        </div>

        {/* Canvas Chart Area */}
        <div class="w-full relative h-[140px] rounded-lg bg-base-200/30 overflow-hidden border border-base-300/40">
          <canvas
            ref={canvasRef}
            class="w-full h-full block"
          />
        </div>
      </div>
    </div>
  );
};

export default SpeedChart;
