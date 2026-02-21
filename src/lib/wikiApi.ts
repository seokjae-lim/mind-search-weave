/**
 * Wiki Backend API Client
 * 
 * Connects to the Knowledge Wiki (KM-AI) backend API.
 * Uses VITE_API_BASE_URL env var, or falls back to /api (proxied via vite).
 * No mock fallback — failures surface clearly via toast.
 */

import { toast } from "@/hooks/use-toast";

// In production, set VITE_API_BASE_URL to the wiki backend URL.
// In dev, vite proxy forwards /api/* to localhost:3000.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// ─── Response Types ───

export interface WikiChunk {
  chunk_id: string;
  file_path: string;
  file_type: string;
  project_path: string;
  doc_title: string;
  location_type: string;
  location_value: string;
  location_detail: string;
  text?: string;
  snippet?: string;
  mtime: string;
  tags: string; // JSON string array
  category: string;
  sub_category?: string;
  author?: string;
  org?: string;
  doc_stage?: string;
  doc_year?: string;
  importance: number;
  view_count: number;
  summary?: string;
  hash?: string;
  rank?: number;
  similarity?: number;
}

export interface WikiSearchResponse {
  results: WikiChunk[];
  total: number;
  page: number;
  limit: number;
  query: string;
  error?: string;
}

export interface WikiBrowseResponse {
  results: WikiChunk[];
  total: number;
  page: number;
  limit: number;
  error?: string;
}

export interface WikiDocDetail extends WikiChunk {
  related: { chunk_id: string; doc_title: string; location_detail: string; snippet: string }[];
  similar: { chunk_id: string; doc_title: string; file_path: string; location_detail: string; category: string; snippet: string }[];
}

export interface WikiStatsResponse {
  total_chunks: number;
  total_files: number;
  by_type: { file_type: string; count: number; file_count: number }[];
  by_project: { project_path: string; chunk_count: number; file_count: number }[];
  by_category: { category: string; count: number }[];
  by_stage: { doc_stage: string; count: number }[];
  by_org: { org: string; count: number }[];
  by_year: { doc_year: string; count: number }[];
  top_viewed: WikiChunk[];
  last_indexed: string | null;
  error?: string;
}

export interface WikiTagItem {
  tag: string;
  count: number;
}

export interface WikiProject {
  project_path: string;
  chunk_count: number;
  file_count: number;
  start_year?: string;
  end_year?: string;
}

export interface WikiAskResponse {
  question: string;
  answer: string;
  sources: {
    chunk_id: string;
    doc_title: string;
    file_type: string;
    file_path: string;
    location_detail: string;
    category: string;
    project_path: string;
    summary?: string;
    similarity?: number;
  }[];
  mode: string;
  model?: string;
  hint?: string;
  error?: string;
}

export interface WikiTrendingResponse {
  popular: WikiChunk[];
  recently_indexed: WikiChunk[];
}

// ─── Helper ───

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, init);
    if (!res.ok) {
      throw new Error(`API ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    const msg = err?.message || "알 수 없는 오류";
    toast({
      title: "백엔드 연결 실패",
      description: `${path} — ${msg}`,
      variant: "destructive",
    });
    throw err;
  }
}

export function parseTags(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return [];
  try {
    const arr = JSON.parse(tagsStr);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ─── API Functions ───

export interface SearchFilters {
  q: string;
  path?: string;
  type?: string;
  project?: string;
  category?: string;
  tag?: string;
  doc_stage?: string;
  org?: string;
  year?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export async function search(filters: SearchFilters): Promise<WikiSearchResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  return fetchJson<WikiSearchResponse>(`/search?${params}`);
}

export async function semanticSearch(filters: SearchFilters): Promise<WikiSearchResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  return fetchJson<WikiSearchResponse>(`/semantic-search?${params}`);
}

export async function browse(filters: Omit<SearchFilters, "q">): Promise<WikiBrowseResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  return fetchJson<WikiBrowseResponse>(`/browse?${params}`);
}

export async function doc(chunkId: string): Promise<WikiDocDetail> {
  return fetchJson<WikiDocDetail>(`/doc/${encodeURIComponent(chunkId)}`);
}

export async function stats(): Promise<WikiStatsResponse> {
  return fetchJson<WikiStatsResponse>("/stats");
}

export async function tags(): Promise<{ tags: WikiTagItem[] }> {
  return fetchJson<{ tags: WikiTagItem[] }>("/tags");
}

export async function projects(): Promise<{ projects: WikiProject[] }> {
  return fetchJson<{ projects: WikiProject[] }>("/projects");
}

export async function categories(): Promise<{ categories: { category: string; sub_category: string; count: number; file_count: number }[] }> {
  return fetchJson("/categories");
}

export async function orgs(): Promise<{ orgs: { org: string; count: number; project_count: number }[] }> {
  return fetchJson("/orgs");
}

export async function trending(): Promise<WikiTrendingResponse> {
  return fetchJson<WikiTrendingResponse>("/trending");
}

export async function ask(question: string, mode?: string): Promise<WikiAskResponse> {
  return fetchJson<WikiAskResponse>("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, mode }),
  });
}

export async function similar(chunkId: string, limit = 10): Promise<{ source_id: string; results: WikiChunk[] }> {
  return fetchJson(`/similar/${encodeURIComponent(chunkId)}?limit=${limit}`);
}

export async function embeddingStats(): Promise<{ total_chunks: number; with_embeddings: number; coverage: number }> {
  return fetchJson("/embedding-stats");
}
