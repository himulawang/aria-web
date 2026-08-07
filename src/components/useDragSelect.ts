import { createSignal } from "solid-js";

export function useDragSelect(
  selectedTasks: () => Set<string>,
  setSelectedTasks: (s: Set<string> | ((prev: Set<string>) => Set<string>)) => void,
) {
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = createSignal({ x: 0, y: 0 });
  let containerRef: HTMLDivElement | undefined;

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    
    const target = e.target as HTMLElement;
    if (target.closest("button, input, a, select, textarea, [role='button']")) {
      return;
    }
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialSelected = new Set(selectedTasks());
    let dragActive = false;
    let animFrameId: number | null = null;
    let latestMouseX = startX;
    let latestMouseY = startY;
    
    const rows = Array.from(containerRef?.querySelectorAll("tr[data-gid]") || []) as HTMLElement[];
    let startGid: string | null = null;
    const startRow = target.closest("tr[data-gid]") as HTMLElement | null;
    if (startRow) {
      startGid = startRow.getAttribute("data-gid");
    } else if (rows.length > 0) {
      let minDistance = Infinity;
      rows.forEach((row) => {
        const rect = row.getBoundingClientRect();
        const dist = Math.abs((rect.top + rect.bottom) / 2 - startY);
        if (dist < minDistance) {
          minDistance = dist;
          startGid = row.getAttribute("data-gid");
        }
      });
    }

    const updateSelection = () => {
      const currentRows = Array.from(containerRef?.querySelectorAll("tr[data-gid]") || []) as HTMLElement[];
      if (currentRows.length === 0) return;

      const gids = currentRows.map((r) => r.getAttribute("data-gid")!).filter(Boolean);
      let startIndex = startGid ? gids.indexOf(startGid) : -1;
      if (startIndex === -1) startIndex = 0;

      const scrollContainer = containerRef?.querySelector(".overflow-auto") || containerRef;
      const scrollRect = scrollContainer ? scrollContainer.getBoundingClientRect() : null;

      let currentIndex = -1;
      if (scrollRect) {
        if (latestMouseY < scrollRect.top) {
          currentIndex = 0;
        } else if (latestMouseY > scrollRect.bottom) {
          currentIndex = gids.length - 1;
        }
      }

      if (currentIndex === -1) {
        const elAtPoint = document.elementFromPoint(latestMouseX, latestMouseY);
        const hoveredRow = elAtPoint?.closest("tr[data-gid]") as HTMLElement | null;
        if (hoveredRow) {
          const hoveredGid = hoveredRow.getAttribute("data-gid");
          if (hoveredGid) currentIndex = gids.indexOf(hoveredGid);
        }
      }

      if (currentIndex === -1) {
        let minDistance = Infinity;
        currentRows.forEach((row, idx) => {
          const rect = row.getBoundingClientRect();
          const dist = Math.abs((rect.top + rect.bottom) / 2 - latestMouseY);
          if (dist < minDistance) {
            minDistance = dist;
            currentIndex = idx;
          }
        });
      }

      if (currentIndex === -1) currentIndex = 0;

      const minIdx = Math.min(startIndex, currentIndex);
      const maxIdx = Math.max(startIndex, currentIndex);
      const rangeGids = new Set(gids.slice(minIdx, maxIdx + 1));

      const newSelected = new Set(initialSelected);
      rangeGids.forEach((gid) => newSelected.add(gid));
      setSelectedTasks(newSelected);
    };

    const autoScrollAndSelect = () => {
      if (!dragActive) return;

      const scrollContainer = containerRef?.querySelector(".overflow-auto") || containerRef;
      if (scrollContainer) {
        const rect = scrollContainer.getBoundingClientRect();
        const edgeThreshold = 40;
        let speed = 0;

        if (latestMouseY < rect.top + edgeThreshold) {
          const factor = Math.min(1, (rect.top + edgeThreshold - latestMouseY) / edgeThreshold);
          speed = -Math.max(3, Math.round(factor * 15));
        } else if (latestMouseY > rect.bottom - edgeThreshold) {
          const factor = Math.min(1, (latestMouseY - (rect.bottom - edgeThreshold)) / edgeThreshold);
          speed = Math.max(3, Math.round(factor * 15));
        }

        if (speed !== 0) {
          scrollContainer.scrollTop += speed;
        }
      }

      updateSelection();
      animFrameId = requestAnimationFrame(autoScrollAndSelect);
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      latestMouseX = moveEvent.clientX;
      latestMouseY = moveEvent.clientY;
      
      if (!dragActive) {
        const dist = Math.hypot(latestMouseX - startX, latestMouseY - startY);
        if (dist > 5) {
          dragActive = true;
          setIsDragging(true);
          setDragStart({ x: startX, y: startY });
          animFrameId = requestAnimationFrame(autoScrollAndSelect);
        }
      }
      
      if (dragActive) {
        setDragEnd({ x: latestMouseX, y: latestMouseY });
      }
    };
    
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (dragActive) {
        setIsDragging(false);
      }
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const setContainerRef = (el: HTMLDivElement | undefined) => {
    containerRef = el;
  };

  return {
    isDragging,
    dragStart,
    dragEnd,
    handleMouseDown,
    setContainerRef,
  };
}

