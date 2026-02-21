/**
 * Wiki Backend API Client
 * 
 * Connects to the Knowledge Wiki (KM-AI) backend API.
 * Uses VITE_API_BASE_URL env var, or falls back to /api (proxied via vite).
 * When the backend is unavailable, returns demo data so the UI can be previewed.
 */

import { toast } from "@/hooks/use-toast";

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

// ─── Demo / Fallback Data ───

let _demoToastShown = false;
function showDemoToast() {
  if (_demoToastShown) return;
  _demoToastShown = true;
  toast({ title: "데모 모드", description: "백엔드 미연결 — 샘플 데이터로 표시됩니다." });
}

const DEMO_PROJECTS: WikiProject[] = [
  { project_path: "국가중점데이터", chunk_count: 124, file_count: 18, start_year: "2022", end_year: "2023" },
  { project_path: "디지털플랫폼정부", chunk_count: 89, file_count: 12, start_year: "2023", end_year: "2024" },
  { project_path: "AI분석플랫폼", chunk_count: 67, file_count: 9, start_year: "2023", end_year: "2024" },
  { project_path: "스마트시티통합플랫폼", chunk_count: 45, file_count: 7, start_year: "2022", end_year: "2023" },
  { project_path: "공공데이터품질관리", chunk_count: 38, file_count: 6, start_year: "2021", end_year: "2022" },
];

function makeDemoChunk(id: string, overrides: Partial<WikiChunk> = {}): WikiChunk {
  return {
    chunk_id: id,
    file_path: overrides.file_path || `${overrides.project_path || "국가중점데이터"}/산출물/${id}.pptx`,
    file_type: overrides.file_type || "pptx",
    project_path: overrides.project_path || "국가중점데이터",
    doc_title: overrides.doc_title || `샘플 문서 ${id}`,
    location_type: "slide",
    location_value: "1",
    location_detail: "슬라이드 1",
    text: overrides.text || "이것은 데모 환경에서 표시되는 샘플 텍스트입니다. 실제 백엔드가 연결되면 실제 문서 내용이 표시됩니다.",
    snippet: overrides.snippet || "데모 샘플 텍스트 미리보기…",
    mtime: overrides.mtime || "2024-06-15T09:00:00Z",
    tags: overrides.tags || '["데이터","분석","AI"]',
    category: overrides.category || "데이터",
    sub_category: overrides.sub_category || "데이터관리",
    author: overrides.author || "홍길동",
    org: overrides.org || "과학기술정보통신부",
    doc_stage: overrides.doc_stage || "최종",
    doc_year: overrides.doc_year || "2024",
    importance: overrides.importance ?? 3,
    view_count: overrides.view_count ?? 42,
    summary: overrides.summary,
    hash: "demo",
    ...overrides,
  };
}

const DEMO_CHUNKS: WikiChunk[] = [
  makeDemoChunk("demo-001", { doc_title: "데이터 거버넌스 체계 수립 보고서", file_type: "pptx", project_path: "국가중점데이터", category: "거버넌스", org: "행정안전부", view_count: 128, tags: '["거버넌스","데이터","정책"]' }),
  makeDemoChunk("demo-002", { doc_title: "AI 도입 현황 분석", file_type: "pdf", project_path: "AI분석플랫폼", category: "AI", org: "과학기술정보통신부", view_count: 95, tags: '["AI","분석","머신러닝"]' }),
  makeDemoChunk("demo-003", { doc_title: "디지털 전환 전략 로드맵", file_type: "pptx", project_path: "디지털플랫폼정부", category: "전략", org: "디지털플랫폼정부위원회", view_count: 87, tags: '["디지털전환","전략","로드맵"]' }),
  makeDemoChunk("demo-004", { doc_title: "공공데이터 품질 진단 결과", file_type: "xlsx", project_path: "공공데이터품질관리", category: "데이터", org: "한국지능정보사회진흥원", view_count: 76, tags: '["품질","데이터","진단"]' }),
  makeDemoChunk("demo-005", { doc_title: "클라우드 전환 계획서", file_type: "docx", project_path: "디지털플랫폼정부", category: "인프라", org: "행정안전부", view_count: 65, tags: '["클라우드","인프라","전환"]' }),
  makeDemoChunk("demo-006", { doc_title: "스마트시티 데이터 허브 설계서", file_type: "pdf", project_path: "스마트시티통합플랫폼", category: "데이터", org: "국토교통부", view_count: 54, tags: '["스마트시티","데이터허브","설계"]' }),
  makeDemoChunk("demo-007", { doc_title: "AI 학습 데이터셋 구축 가이드", file_type: "hwp", project_path: "AI분석플랫폼", category: "AI", org: "과학기술정보통신부", view_count: 48, tags: '["AI","데이터셋","가이드"]' }),
  makeDemoChunk("demo-008", { doc_title: "데이터 표준화 지침서", file_type: "pdf", project_path: "국가중점데이터", category: "거버넌스", org: "행정안전부", view_count: 43, tags: '["표준화","데이터","지침"]' }),
  makeDemoChunk("demo-009", { doc_title: "사업 관리 현황 대시보드 기획안", file_type: "pptx", project_path: "공공데이터품질관리", category: "사업관리", org: "한국지능정보사회진흥원", view_count: 39, tags: '["사업관리","대시보드","기획"]' }),
  makeDemoChunk("demo-010", { doc_title: "빅데이터 분석 결과 보고서", file_type: "xlsx", project_path: "AI분석플랫폼", category: "데이터", org: "과학기술정보통신부", view_count: 35, tags: '["빅데이터","분석","결과"]' }),
  makeDemoChunk("demo-011", { doc_title: "보건의료 데이터 활용 방안", file_type: "pptx", project_path: "국가중점데이터", category: "데이터", org: "보건복지부", view_count: 31, tags: '["보건","의료","데이터"]' }),
  makeDemoChunk("demo-012", { doc_title: "개인정보 보호 영향평가서", file_type: "docx", project_path: "디지털플랫폼정부", category: "거버넌스", org: "개인정보보호위원회", view_count: 28, tags: '["개인정보","보호","영향평가"]' }),
];

const DEMO_TAGS: WikiTagItem[] = [
  { tag: "데이터", count: 45 }, { tag: "AI", count: 38 }, { tag: "분석", count: 32 },
  { tag: "거버넌스", count: 28 }, { tag: "전략", count: 24 }, { tag: "클라우드", count: 21 },
  { tag: "디지털전환", count: 19 }, { tag: "인프라", count: 17 }, { tag: "품질", count: 15 },
  { tag: "보안", count: 13 }, { tag: "표준화", count: 12 }, { tag: "스마트시티", count: 11 },
  { tag: "머신러닝", count: 9 }, { tag: "빅데이터", count: 8 }, { tag: "로드맵", count: 7 },
];

const DEMO_STATS: WikiStatsResponse = {
  total_chunks: 363,
  total_files: 52,
  by_type: [
    { file_type: "pptx", count: 145, file_count: 20 },
    { file_type: "pdf", count: 98, file_count: 14 },
    { file_type: "xlsx", count: 52, file_count: 8 },
    { file_type: "docx", count: 38, file_count: 5 },
    { file_type: "hwp", count: 30, file_count: 5 },
  ],
  by_project: DEMO_PROJECTS.map((p) => ({ project_path: p.project_path, chunk_count: p.chunk_count, file_count: p.file_count })),
  by_category: [
    { category: "데이터", count: 120 },
    { category: "AI", count: 85 },
    { category: "거버넌스", count: 62 },
    { category: "전략", count: 48 },
    { category: "인프라", count: 30 },
    { category: "사업관리", count: 18 },
  ],
  by_stage: [
    { doc_stage: "최종", count: 180 },
    { doc_stage: "초안", count: 95 },
    { doc_stage: "검토", count: 55 },
    { doc_stage: "작성중", count: 33 },
  ],
  by_org: [
    { org: "과학기술정보통신부", count: 95 },
    { org: "행정안전부", count: 78 },
    { org: "한국지능정보사회진흥원", count: 65 },
    { org: "국토교통부", count: 45 },
    { org: "보건복지부", count: 42 },
    { org: "디지털플랫폼정부위원회", count: 38 },
  ],
  by_year: [
    { doc_year: "2024", count: 140 },
    { doc_year: "2023", count: 125 },
    { doc_year: "2022", count: 65 },
    { doc_year: "2021", count: 33 },
  ],
  top_viewed: DEMO_CHUNKS.slice(0, 10),
  last_indexed: "2024-12-15T14:30:00Z",
};

const DEMO_CATEGORIES = [
  { category: "데이터", sub_category: "데이터관리", count: 65, file_count: 10 },
  { category: "데이터", sub_category: "데이터분석", count: 55, file_count: 8 },
  { category: "AI", sub_category: "머신러닝", count: 45, file_count: 6 },
  { category: "AI", sub_category: "자연어처리", count: 40, file_count: 5 },
  { category: "거버넌스", sub_category: "정책", count: 35, file_count: 5 },
  { category: "전략", sub_category: "디지털전환", count: 30, file_count: 4 },
  { category: "인프라", sub_category: "클라우드", count: 20, file_count: 3 },
  { category: "사업관리", sub_category: "PMO", count: 18, file_count: 3 },
];

// ─── Helper ───

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, init);
    if (!res.ok) {
      throw new Error(`API ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    // Re-throw so callers can fallback to demo data
    throw err;
  }
}

/** Try API first, fall back to demo data on failure */
async function fetchWithFallback<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    return await fetchJson<T>(path, init);
  } catch {
    showDemoToast();
    return fallback;
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

// ─── API Functions (with demo fallback) ───

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

function buildParams(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  return params.toString();
}

export async function search(filters: SearchFilters): Promise<WikiSearchResponse> {
  const q = (filters.q || "").toLowerCase();
  let fallbackResults = DEMO_CHUNKS.filter(
    (c) => c.doc_title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.tags.toLowerCase().includes(q)
  );
  // Apply demo filters for type, project, category
  if (filters.type) {
    fallbackResults = fallbackResults.filter((c) => c.file_type === filters.type);
  }
  if (filters.project) {
    fallbackResults = fallbackResults.filter((c) => c.project_path === filters.project);
  }
  if (filters.category) {
    fallbackResults = fallbackResults.filter((c) => c.category === filters.category);
  }
  if (filters.org) {
    fallbackResults = fallbackResults.filter((c) => c.org === filters.org);
  }
  const fallback: WikiSearchResponse = {
    results: fallbackResults, total: fallbackResults.length, page: 1, limit: 20, query: filters.q,
  };
  return fetchWithFallback(`/search?${buildParams(filters)}`, fallback);
}

export async function semanticSearch(filters: SearchFilters): Promise<WikiSearchResponse> {
  return search(filters); // fallback is the same
}

export async function browse(filters: Omit<SearchFilters, "q">): Promise<WikiBrowseResponse> {
  const project = filters.project || "";
  const fallbackResults = project
    ? DEMO_CHUNKS.filter((c) => c.project_path === project)
    : DEMO_CHUNKS;
  const fallback: WikiBrowseResponse = {
    results: fallbackResults, total: fallbackResults.length, page: 1, limit: 50,
  };
  return fetchWithFallback(`/browse?${buildParams(filters)}`, fallback);
}

export async function doc(chunkId: string): Promise<WikiDocDetail> {
  const found = DEMO_CHUNKS.find((c) => c.chunk_id === chunkId) || DEMO_CHUNKS[0];
  const fallback: WikiDocDetail = {
    ...found,
    text: found.text || "데모 모드에서 표시되는 샘플 문서 내용입니다.\n\n실제 백엔드가 연결되면 전체 문서 내용을 볼 수 있습니다.\n\n## 주요 내용\n- 데이터 거버넌스 체계 구축\n- AI 모델 학습 데이터 품질 기준\n- 클라우드 전환 로드맵",
    related: DEMO_CHUNKS.slice(1, 4).map((c) => ({
      chunk_id: c.chunk_id, doc_title: c.doc_title, location_detail: "슬라이드 1", snippet: c.snippet || "",
    })),
    similar: DEMO_CHUNKS.slice(4, 7).map((c) => ({
      chunk_id: c.chunk_id, doc_title: c.doc_title, file_path: c.file_path, location_detail: "슬라이드 1", category: c.category, snippet: c.snippet || "",
    })),
  };
  return fetchWithFallback(`/doc/${encodeURIComponent(chunkId)}`, fallback);
}

export async function stats(): Promise<WikiStatsResponse> {
  return fetchWithFallback("/stats", DEMO_STATS);
}

export async function tags(): Promise<{ tags: WikiTagItem[] }> {
  return fetchWithFallback("/tags", { tags: DEMO_TAGS });
}

export async function projects(): Promise<{ projects: WikiProject[] }> {
  return fetchWithFallback("/projects", { projects: DEMO_PROJECTS });
}

export async function categories(): Promise<{ categories: { category: string; sub_category: string; count: number; file_count: number }[] }> {
  return fetchWithFallback("/categories", { categories: DEMO_CATEGORIES });
}

export async function orgs(): Promise<{ orgs: { org: string; count: number; project_count: number }[] }> {
  const fallback = {
    orgs: DEMO_STATS.by_org.map((o) => ({ org: o.org, count: o.count, project_count: 2 })),
  };
  return fetchWithFallback("/orgs", fallback);
}

export async function trending(): Promise<WikiTrendingResponse> {
  const fallback: WikiTrendingResponse = {
    popular: DEMO_CHUNKS.slice(0, 6),
    recently_indexed: [...DEMO_CHUNKS].sort((a, b) => b.mtime.localeCompare(a.mtime)).slice(0, 6),
  };
  return fetchWithFallback("/trending", fallback);
}

export async function ask(question: string, mode?: string): Promise<WikiAskResponse> {
  const fallback: WikiAskResponse = {
    question,
    answer: `[데모 모드] "${question}"에 대한 답변입니다.\n\n현재 백엔드가 연결되어 있지 않아 실제 RAG 검색이 수행되지 않습니다. 백엔드를 연결하면 문서 기반의 정확한 답변을 받을 수 있습니다.\n\n샘플 답변:\n- 데이터 거버넌스 성숙도는 3.2/5.0 수준입니다\n- AI 도입률은 공공부문 기준 약 23%입니다\n- 클라우드 전환율은 45% 달성되었습니다`,
    sources: DEMO_CHUNKS.slice(0, 3).map((c) => ({
      chunk_id: c.chunk_id,
      doc_title: c.doc_title,
      file_type: c.file_type,
      file_path: c.file_path,
      location_detail: "슬라이드 1",
      category: c.category,
      project_path: c.project_path,
      summary: c.summary,
    })),
    mode: "demo",
    model: "demo",
  };
  return fetchWithFallback("/ask", fallback, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, mode }),
  });
}

export async function similar(chunkId: string, limit = 10): Promise<{ source_id: string; results: WikiChunk[] }> {
  const simScores = [0.95, 0.91, 0.87, 0.82, 0.78, 0.74, 0.69, 0.65, 0.61, 0.56];
  const fallbackResults = DEMO_CHUNKS.filter(c => c.chunk_id !== chunkId).slice(0, Math.min(limit, DEMO_CHUNKS.length)).map((c, i) => ({ ...c, similarity: simScores[i] ?? 0.5 }));
  const fallback = { source_id: chunkId, results: fallbackResults };
  return fetchWithFallback(`/similar/${encodeURIComponent(chunkId)}?limit=${limit}`, fallback);
}

export async function embeddingStats(): Promise<{ total_chunks: number; with_embeddings: number; coverage: number }> {
  return fetchWithFallback("/embedding-stats", { total_chunks: 363, with_embeddings: 340, coverage: 0.94 });
}
