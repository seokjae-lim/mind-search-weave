export interface ChunkLocation {
  slide?: number | null;
  page?: number | null;
  sheet?: string | null;
  row?: number | null;
  col?: number | null;
  cell?: number | null;
}

export type FileType = "pptx" | "pdf" | "xlsx" | "csv" | "ipynb" | "hwp" | "docx";

export interface ChunkRecord {
  chunk_id: string;
  file_path: string;
  project_path: string;
  file_type: FileType;
  doc_title: string;
  location: ChunkLocation;
  text: string;
  tags: string[];
  mtime: string;
  hash: string;
}

export interface SearchResult {
  chunk: ChunkRecord;
  score: number;
  highlight: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  took_ms: number;
}

export interface ProjectStats {
  project_path: string;
  file_count: number;
  chunk_count: number;
}

export interface IndexStats {
  total_files: number;
  total_chunks: number;
  last_updated: string;
  by_type: Record<FileType, number>;
  by_project: ProjectStats[];
  failed_files: FailedFile[];
}

export interface FailedFile {
  file_path: string;
  error: string;
  last_attempt: string;
}

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  file_count: number;
}

export interface BrowseResponse {
  tree: FolderNode;
  files: BrowseFile[];
}

export interface BrowseFile {
  file_path: string;
  file_type: FileType;
  doc_title: string;
  chunk_count: number;
  mtime: string;
  project_path: string;
}

export interface SearchFilters {
  query: string;
  path?: string;
  types?: FileType[];
  sort?: "relevance" | "recent";
}

// ─── Advanced Search Types ───
export type SearchOperator = "AND" | "OR" | "NOT";
export type SearchField = "all" | "title" | "project" | "tag" | "content";

export interface AdvancedSearchRow {
  id: string;
  field: SearchField;
  operator: SearchOperator;
  keyword: string;
}

// ─── AI Chat Types ───
export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  references?: AIChatReference[];
}

export interface AIChatReference {
  chunk_id: string;
  doc_title: string;
  file_path: string;
  snippet: string;
}

// ─── Knowledge Graph Types ───
export interface GraphNode {
  id: string;
  label: string;
  type: "document" | "keyword" | "project" | "tag";
  val?: number;
  color?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ─── Word Cloud Types ───
export interface WordCloudItem {
  text: string;
  value: number;
}
