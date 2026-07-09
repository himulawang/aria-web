  // Fetch selection state when tab changes to 'files'
  createEffect(async () => {
    const gid = state.selectedTaskDetail?.gid;
    if (activeTab() === "files" && gid) {
      try {
        const val = await aria2Store.getTaskOption(gid, "select-file");
        if (val && typeof val === "string" && val.trim() !== "") {
          const indices = new Set(
            val.split(",")
               .flatMap(part => {
                 if (part.includes("-")) {
                   const [start, end] = part.split("-").map(Number);
                   return Array.from({length: end - start + 1}, (_, i) => start + i);
                 }
                 return [Number(part)];
               })
               .filter(n => !isNaN(n))
          );
          setSelectedIndices(indices);
        } else {
          setSelectedIndices(new Set());
        }
      } catch (e) {
        console.error(`Failed to fetch select-file option: ${e}`);
      }
    }
  });

  const toggleFileSelection = async (index: number) => {
    const current = new Set(selectedIndices());
    if (current.has(index)) {
      current.delete(index);
    } else {
      current.add(index);
    }
    setSelectedIndices(current);
    
    const gid = state.selectedTaskDetail?.gid;
    if (gid) {
      const indicesString = Array.from(current).sort((a, b) => a - b).join(",");
      await aria2Store.changeTaskOption(gid, { "select-file": indicesString });
    }
  };
