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
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const currentY = moveEvent.clientY;
      
      if (!dragActive) {
        const dist = Math.hypot(currentX - startX, currentY - startY);
        if (dist > 5) {
          dragActive = true;
          setIsDragging(true);
          setDragStart({ x: startX, y: startY });
        }
      }
      
      if (dragActive) {
        setDragEnd({ x: currentX, y: currentY });
        
        const x1 = Math.min(startX, currentX);
        const y1 = Math.min(startY, currentY);
        const x2 = Math.max(startX, currentX);
        const y2 = Math.max(startY, currentY);
        
        const newSelected = new Set(initialSelected);
        
        const rows = containerRef?.querySelectorAll("tr[data-gid]");
        if (rows) {
          rows.forEach((rowEl) => {
            const gid = rowEl.getAttribute("data-gid");
            if (!gid) return;
            
            const rect = rowEl.getBoundingClientRect();
            const intersects = rect.left < x2 && rect.right > x1 && rect.top < y2 && rect.bottom > y1;
            
            if (intersects) {
              if (initialSelected.has(gid)) {
                newSelected.delete(gid);
              } else {
                newSelected.add(gid);
              }
            } else {
              if (initialSelected.has(gid)) {
                newSelected.add(gid);
              } else {
                newSelected.delete(gid);
              }
            }
          });
        }
        
        setSelectedTasks(newSelected);
      }
    };
    
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
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
