import { createSignal, onCleanup, For, Show, createMemo, type Component } from "solid-js";
import { aria2Store } from "../store";
import { formatSize } from "../utils/format";
import { HiOutlineMagnifyingGlass, HiOutlinePlus, HiOutlineChevronLeft, HiOutlineChevronRight } from "solid-icons/hi";
import { notificationStore } from "../store/notification-store";

interface EdkSearchResult {
  hash: string;
  name: string;
  length: string;   // bytes as string from RPC (KEY_LENGTH)
  sourceCount: number;
  completeSourceCount: number;
  fileType: string;
  extension: string;
  ed2kLink: string; // ed2k:// URI to download
  sourceNetwork: string;
}

const PAGE_SIZE = 20;

const Ed2kSearch: Component = () => {
  const [keyword, setKeyword] = createSignal("");

  // Accumulated results keyed by hash for deduplication
  const [resultMap, setResultMap] = createSignal<Map<string, EdkSearchResult>>(new Map());
  const [searching, setSearching] = createSignal(false);
  const [moreResultsPending, setMoreResultsPending] = createSignal(false);
  const [fileType, setFileType] = createSignal<"all" | "video" | "audio" | "archive" | "document">("all");
  const [sortBy, setSortBy] = createSignal<"relevance" | "size" | "sources">("relevance");
  const [currentPage, setCurrentPage] = createSignal(1);

  let currentSearchGid: string | null = null;
  let pollInterval: any = null;
  let pollCounter = 0;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  const cleanupSearch = async (removeFromAria2 = true) => {
    stopPolling();
    if (currentSearchGid) {
      const gid = currentSearchGid;
      currentSearchGid = null;
      if (removeFromAria2) {
        // Remove the hidden search task from aria2 so it doesn't linger
        aria2Store.removeTask(gid).catch(() => {});
        setTimeout(() => {
          aria2Store.removeDownloadResult(gid).catch(() => {});
          aria2Store.unhideGid(gid);
        }, 500);
      } else {
        aria2Store.unhideGid(gid);
      }
    }
  };

  onCleanup(() => {
    cleanupSearch();
  });

  const startPolling = (gid: string) => {
    stopPolling();
    pollCounter = 0;
    consecutiveErrors = 0;
    pollInterval = setInterval(async () => {
      if (pollCounter >= 30) { // up to 60 seconds
        stopPolling();
        setSearching(false);
        setMoreResultsPending(false);
        cleanupSearch(true);
        const total = resultMap().size;
        notificationStore.add(`ED2K search timed out — ${total} result(s) collected`, "info");
        return;
      }
      pollCounter++;
      try {
        // Backend returns { gid, moreResults, results: [...] }
        // results contains ALL accumulated entries (backend deduplicates by hash)
        const resp = await aria2Store.getEd2kSearchResults(gid);
        consecutiveErrors = 0; // reset on success
        const entries: any[] = resp?.results ?? [];

        if (entries.length > 0) {
          // Merge into our local map (backend already deduplicates, but we keep Map for O(1) lookup)
          setResultMap((prev) => {
            const next = new Map(prev);
            for (const r of entries) {
              const hash = r.hash || "";
              if (hash) {
                next.set(hash, {
                  hash,
                  name: r.name || "Unknown File",
                  length: String(r.length || 0),
                  sourceCount: Number(r.sourceCount || 0),
                  completeSourceCount: Number(r.completeSourceCount || 0),
                  fileType: r.fileType || "",
                  extension: r.extension || "",
                  ed2kLink: r.ed2kLink || "",
                  sourceNetwork: r.sourceNetwork || "",
                });
              }
            }
            return next;
          });
        }

        const more = !!resp?.moreResults;
        setMoreResultsPending(more);

        if (!more) {
          stopPolling();
          setSearching(false);
          const total = resultMap().size;
          cleanupSearch(true);
          notificationStore.add(`ED2K search complete — ${total} result(s)`, "info");
        }
      } catch (err: any) {
        const errMsg = String(err);
        if (errMsg.includes("No ED2K search data")) {
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            // Task is truly gone from aria2 — stop
            stopPolling();
            setSearching(false);
            setMoreResultsPending(false);
            const total = resultMap().size;
            if (total === 0) {
              notificationStore.add("ED2K search returned no results", "info");
            } else {
              cleanupSearch(false); // don't try to remove — already gone
              notificationStore.add(`ED2K search complete — ${total} result(s)`, "info");
            }
          }
          // else: keep polling, maybe the task just completed but results are still accessible
        } else {
          console.error("Failed to poll ed2k results:", err);
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            stopPolling();
            setSearching(false);
            setMoreResultsPending(false);
            notificationStore.add(`ED2K search failed: ${err}`, "error");
          }
        }
      }
    }, 2000);
  };

  const handleSearch = async (e: Event) => {
    e.preventDefault();
    const query = keyword().trim();
    if (!query) return;

    // Clean up any previous search (don't try to remove it from aria2 — just unhide it)
    cleanupSearch(false);
    setResultMap(new Map());
    setCurrentPage(1);
    setSearching(true);
    setMoreResultsPending(false);

    try {
      const gid = await aria2Store.ed2kSearch(query);
      if (gid) {
        currentSearchGid = gid;
        // Hide this GID from the task list immediately
        aria2Store.hideGid(gid);
        startPolling(gid);
      } else {
        setSearching(false);
        notificationStore.add("Failed to start ED2K search", "error");
      }
    } catch (err) {
      setSearching(false);
      notificationStore.add(`Search error: ${err}`, "error");
    }
  };

  const handleDownload = async (ed2kLink: string, name: string) => {
    try {
      await aria2Store.addTask([ed2kLink]);
      notificationStore.add(`Added task: ${name}`, "success");
    } catch (err) {
      notificationStore.add(`Failed to add download task: ${err}`, "error");
    }
  };

  // Local helper to match extensions
  const getFileCategory = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    if (["mp4", "mkv", "avi", "rmvb", "mov", "wmv", "flv", "webm"].includes(ext)) return "video";
    if (["mp3", "flac", "ape", "wav", "aac", "ogg", "m4a", "wma"].includes(ext)) return "audio";
    if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"].includes(ext)) return "archive";
    if (["pdf", "txt", "epub", "docx", "xlsx", "pptx", "doc", "xls", "mobi"].includes(ext)) return "document";
    return "other";
  };

  // Filter & Sort all results
  const filteredAndSorted = createMemo(() => {
    let list = Array.from(resultMap().values());

    const activeType = fileType();
    if (activeType !== "all") {
      list = list.filter((item) => getFileCategory(item.name) === activeType);
    }

    const activeSort = sortBy();
    list = [...list].sort((a, b) => {
      if (activeSort === "size") return Number(b.length) - Number(a.length);
      if (activeSort === "sources") return b.sourceCount - a.sourceCount;
      return 0;
    });

    return list;
  });

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(filteredAndSorted().length / PAGE_SIZE))
  );

  // Current page items
  const pageItems = createMemo(() => {
    const page = Math.min(currentPage(), totalPages());
    const start = (page - 1) * PAGE_SIZE;
    return filteredAndSorted().slice(start, start + PAGE_SIZE);
  });

  // Reset to page 1 when filter/sort changes
  const setFileTypeAndReset = (v: typeof fileType extends () => infer R ? R : never) => {
    setFileType(v as any);
    setCurrentPage(1);
  };
  const setSortByAndReset = (v: typeof sortBy extends () => infer R ? R : never) => {
    setSortBy(v as any);
    setCurrentPage(1);
  };

  return (
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">ED2K eMule Search</h2>
        <Show when={searching()}>
          <div class="flex items-center gap-2">
            <span class="loading loading-spinner loading-xs"></span>
            <span class="badge badge-primary animate-pulse py-3">
              {moreResultsPending() ? "Fetching more results..." : "Searching ED2K Network..."}
            </span>
          </div>
        </Show>
      </div>

      <form onSubmit={handleSearch} class="flex flex-col md:flex-row gap-3">
        <div class="relative flex-1">
          <input
            type="text"
            placeholder="Search files on ED2K network (e.g. Ubuntu)..."
            class="input input-bordered w-full pl-10"
            value={keyword()}
            onInput={(e) => setKeyword(e.currentTarget.value)}
          />
          <HiOutlineMagnifyingGlass class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
        </div>
        <button
          type="submit"
          class="btn btn-primary"
          disabled={searching() || !keyword().trim()}
        >
          {searching() ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Filter and Sort bar */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-4 rounded-xl border border-base-300">
        <div class="flex flex-wrap gap-1">
          {[
            { id: "all", label: "All Types" },
            { id: "video", label: "Videos" },
            { id: "audio", label: "Audios" },
            { id: "archive", label: "Archives" },
            { id: "document", label: "Documents" },
          ].map((type) => (
            <button
              onClick={() => setFileTypeAndReset(type.id as any)}
              class={`btn btn-xs rounded-full ${fileType() === type.id ? "btn-primary" : "btn-ghost"}`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div class="flex items-center gap-4">
          <Show when={filteredAndSorted().length > 0}>
            <span class="text-xs opacity-50">{filteredAndSorted().length} result(s)</span>
          </Show>
          <div class="flex items-center gap-2">
            <span class="text-xs opacity-60">Sort by:</span>
            <select
              class="select select-bordered select-xs"
              value={sortBy()}
              onChange={(e) => setSortByAndReset(e.currentTarget.value as any)}
            >
              <option value="relevance">Relevance</option>
              <option value="size">Size</option>
              <option value="sources">Sources / Peers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div class="overflow-x-auto bg-base-100 rounded-xl border border-base-300">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>File Name</th>
              <th class="w-28 text-right">Size</th>
              <th class="w-28 text-right">Sources</th>
              <th class="w-20 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <Show
              when={!searching() || filteredAndSorted().length > 0}
              fallback={
                // Skeleton loading state
                <For each={Array.from({ length: 5 })}>
                  {() => (
                    <tr class="animate-pulse">
                      <td><div class="h-4 bg-base-300 rounded w-2/3"></div></td>
                      <td><div class="h-4 bg-base-300 rounded w-16 ml-auto"></div></td>
                      <td><div class="h-4 bg-base-300 rounded w-12 ml-auto"></div></td>
                      <td><div class="h-6 bg-base-300 rounded w-10 mx-auto"></div></td>
                    </tr>
                  )}
                </For>
              }
            >
              <Show
                when={pageItems().length > 0}
                fallback={
                  <tr>
                    <td colspan="4" class="text-center py-8 opacity-55">
                      No search results yet. Type query and hit search.
                    </td>
                  </tr>
                }
              >
                <For each={pageItems()}>
                  {(result) => (
                    <tr class="hover">
                      <td class="font-medium text-sm break-all max-w-lg">
                        <div class="flex flex-col gap-0.5">
                          <span>{result.name}</span>
                          <Show when={result.sourceNetwork}>
                            <span class="text-xs opacity-40">{result.sourceNetwork}</span>
                          </Show>
                        </div>
                      </td>
                      <td class="text-right text-xs whitespace-nowrap">
                        {formatSize(Number(result.length))}
                      </td>
                      <td class="text-right text-xs">
                        <span class="badge badge-ghost badge-sm" title={`${result.completeSourceCount} complete sources`}>
                          {result.sourceCount}
                        </span>
                      </td>
                      <td class="text-center">
                        <button
                          onClick={() => handleDownload(result.ed2kLink, result.name)}
                          class="btn btn-primary btn-xs btn-square"
                          title={result.ed2kLink || "No link available"}
                          disabled={!result.ed2kLink}
                        >
                          <HiOutlinePlus class="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </Show>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Show when={filteredAndSorted().length > PAGE_SIZE}>
        <div class="flex items-center justify-center gap-2">
          <button
            class="btn btn-sm btn-ghost btn-square"
            disabled={currentPage() <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            title="Previous page"
          >
            <HiOutlineChevronLeft class="w-4 h-4" />
          </button>

          <div class="flex items-center gap-1">
            <For each={Array.from({ length: Math.min(totalPages(), 7) }, (_, i) => {
              // Show pages around current page
              const total = totalPages();
              const cur = currentPage();
              if (total <= 7) return i + 1;
              if (cur <= 4) return i + 1;
              if (cur >= total - 3) return total - 6 + i;
              return cur - 3 + i;
            })}>
              {(page) => (
                <button
                  class={`btn btn-sm btn-square ${currentPage() === page ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )}
            </For>
          </div>

          <button
            class="btn btn-sm btn-ghost btn-square"
            disabled={currentPage() >= totalPages()}
            onClick={() => setCurrentPage((p) => Math.min(totalPages(), p + 1))}
            title="Next page"
          >
            <HiOutlineChevronRight class="w-4 h-4" />
          </button>

          <span class="text-xs opacity-50 ml-2">
            Page {currentPage()} / {totalPages()}
            {searching() && moreResultsPending() ? " · loading more..." : ""}
          </span>
        </div>
      </Show>
    </div>
  );
};

export default Ed2kSearch;
