import type { SearchResponse, SearchFilters, ChunkRecord, IndexStats, BrowseResponse, FolderNode, BrowseFile } from "./types";
import { MOCK_CHUNKS, MOCK_FOLDER_TREE, MOCK_BROWSE_FILES, MOCK_STATS } from "./mock-data";

const USE_MOCK = true;
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function highlightText(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
}

export async function searchChunks(filters: SearchFilters): Promise<SearchResponse> {
  if (!USE_MOCK) {
    const params = new URLSearchParams({ q: filters.query });
    if (filters.path) params.set("path", filters.path);
    if (filters.types?.length) params.set("type", filters.types.join(","));
    if (filters.sort) params.set("sort", filters.sort);
    return fetchJson(`/search?${params}`);
  }

  const q = filters.query.toLowerCase();
  let results = MOCK_CHUNKS
    .filter((c) => {
      const matchText = c.text.toLowerCase().includes(q) || c.doc_title.toLowerCase().includes(q) || c.file_path.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q));
      const matchPath = !filters.path || c.project_path.startsWith(filters.path) || c.file_path.startsWith(filters.path);
      const matchType = !filters.types?.length || filters.types.includes(c.file_type);
      return matchText && matchPath && matchType;
    })
    .map((c) => ({
      chunk: c,
      score: c.text.toLowerCase().split(q).length - 1,
      highlight: highlightText(c.text.substring(0, 200), filters.query),
    }));

  if (filters.sort === "recent") {
    results.sort((a, b) => b.chunk.mtime.localeCompare(a.chunk.mtime));
  } else {
    results.sort((a, b) => b.score - a.score);
  }

  return { results, total: results.length, query: filters.query, took_ms: 12 };
}

export async function getChunkById(chunkId: string): Promise<ChunkRecord | null> {
  if (!USE_MOCK) {
    return fetchJson(`/doc/${chunkId}`);
  }
  return MOCK_CHUNKS.find((c) => c.chunk_id === chunkId) ?? null;
}

export async function getChunksByFile(filePath: string): Promise<ChunkRecord[]> {
  if (!USE_MOCK) {
    return fetchJson(`/doc/file?path=${encodeURIComponent(filePath)}`);
  }
  return MOCK_CHUNKS.filter((c) => c.file_path === filePath);
}

export async function getStats(): Promise<IndexStats> {
  if (!USE_MOCK) return fetchJson("/stats");
  return MOCK_STATS;
}

export async function getBrowseTree(): Promise<FolderNode> {
  if (!USE_MOCK) return fetchJson("/browse");
  return MOCK_FOLDER_TREE;
}

export async function getBrowseFiles(path?: string): Promise<BrowseFile[]> {
  if (!USE_MOCK) return fetchJson(`/browse/files?path=${path || ""}`);
  if (!path) return MOCK_BROWSE_FILES;
  return MOCK_BROWSE_FILES.filter((f) => f.file_path.startsWith(path));
}
