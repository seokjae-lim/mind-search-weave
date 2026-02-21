import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderOpen, ChevronRight, ChevronDown, File, Search, LayoutGrid, GitBranchPlus,
  ChevronsUpDown, ChevronsDownUp, Network, Eye, Calendar, Filter, ListFilter
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { projects as apiProjects, browse as apiBrowse, categories as apiCategories, parseTags } from "@/lib/wikiApi";
import type { WikiChunk } from "@/lib/wikiApi";
import type { FolderNode, BrowseFile } from "@/lib/types";
import { FileTypeIcon, FileTypeBadge, CategoryBadge } from "@/components/FileTypeIcon";
import { MindMap } from "@/components/MindMap";
import { KnowledgeGraphEmbed } from "@/components/KnowledgeGraphEmbed";

function buildTreeFromProjects(projectList: { project_path: string; chunk_count: number; file_count: number }[]): FolderNode {
  const root: FolderNode = { name: "컨설팅산출물", path: "", children: [], file_count: 0 };
  projectList.forEach((p) => {
    root.children.push({ name: p.project_path, path: p.project_path, children: [], file_count: p.file_count });
  });
  return root;
}

function chunkToBrowseFile(c: WikiChunk): BrowseFile {
  return {
    file_path: c.file_path,
    file_type: c.file_type as any,
    doc_title: c.doc_title,
    chunk_count: 1,
    mtime: c.mtime,
    project_path: c.project_path,
  };
}

function deduplicateFiles(chunks: WikiChunk[]): BrowseFile[] {
  const map = new Map<string, BrowseFile>();
  chunks.forEach((c) => {
    const existing = map.get(c.file_path);
    if (existing) { existing.chunk_count += 1; }
    else { map.set(c.file_path, chunkToBrowseFile(c)); }
  });
  return Array.from(map.values());
}

// Extended file info for card display
interface FileCardInfo extends BrowseFile {
  category?: string;
  tags?: string[];
  org?: string;
  view_count?: number;
  doc_stage?: string;
}

function chunkToCardInfo(c: WikiChunk): FileCardInfo {
  return {
    ...chunkToBrowseFile(c),
    category: c.category,
    tags: parseTags(c.tags),
    org: c.org,
    view_count: c.view_count,
    doc_stage: c.doc_stage,
  };
}

function deduplicateCards(chunks: WikiChunk[]): FileCardInfo[] {
  const map = new Map<string, FileCardInfo>();
  chunks.forEach((c) => {
    const existing = map.get(c.file_path);
    if (existing) { existing.chunk_count += 1; }
    else { map.set(c.file_path, chunkToCardInfo(c)); }
  });
  return Array.from(map.values());
}

const FILE_TYPES = [
  { value: "all", label: "전체 유형" },
  { value: "pptx", label: "PPT" },
  { value: "pdf", label: "PDF" },
  { value: "xlsx", label: "Excel" },
  { value: "docx", label: "Word" },
  { value: "hwp", label: "HWP" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "최신순" },
  { value: "views", label: "조회순" },
  { value: "name", label: "이름순" },
  { value: "chunks", label: "청크순" },
];

export default function BrowsePage() {
  const [tree, setTree] = useState<FolderNode | null>(null);
  const [files, setFiles] = useState<BrowseFile[]>([]);
  const [cardFiles, setCardFiles] = useState<FileCardInfo[]>([]);
  const [allFiles, setAllFiles] = useState<BrowseFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [scopedSearch, setScopedSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "mindmap" | "knowledge-graph">("tree");
  const [treeExpandAll, setTreeExpandAll] = useState<boolean | null>(null);
  const [allFilesLoaded, setAllFilesLoaded] = useState(false);
  const navigate = useNavigate();

  // Filter state
  const [projectList, setProjectList] = useState<{ project_path: string; chunk_count: number; file_count: number }[]>([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [catList, setCatList] = useState<{ category: string; count: number }[]>([]);
  const [selectedCat, setSelectedCat] = useState("all");

  // Load projects + categories
  useEffect(() => {
    apiProjects().then((res) => {
      setProjectList(res.projects);
      const t = buildTreeFromProjects(res.projects);
      setTree(t);
    }).catch(() => {});
    apiCategories().then((r) => {
      const unique = new Map<string, number>();
      (r.categories || []).forEach(c => {
        unique.set(c.category, (unique.get(c.category) || 0) + c.count);
      });
      setCatList(Array.from(unique.entries()).map(([category, count]) => ({ category, count })));
    }).catch(() => {});
  }, []);

  // Load all files for card grid on tree tab
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiBrowse({ limit: 200, sort: "views" });
        setCardFiles(deduplicateCards(res.results));
        setFiles(deduplicateFiles(res.results));
        setAllFiles(deduplicateFiles(res.results));
        setAllFilesLoaded(true);
      } catch {
        setCardFiles([]);
      }
    };
    load();
  }, []);

  // Load more on mindmap
  useEffect(() => {
    if (viewMode === "mindmap" && !allFilesLoaded && tree) {
      apiBrowse({ limit: 200, sort: "views" }).then(res => {
        setAllFiles(deduplicateFiles(res.results));
        setAllFilesLoaded(true);
      }).catch(() => setAllFiles([]));
    }
  }, [viewMode, allFilesLoaded, tree]);

  const selectFolder = async (path: string) => {
    setSelectedPath(path);
    try {
      const res = await apiBrowse({ project: path || undefined, limit: 100 });
      setFiles(deduplicateFiles(res.results));
    } catch { setFiles([]); }
  };

  const doScopedSearch = () => {
    if (!searchQuery.trim()) return;
    const params = new URLSearchParams({ q: searchQuery });
    if (scopedSearch && selectedPath) params.set("path", selectedPath);
    navigate(`/?${params}`);
  };

  // Filter + sort for card view
  const filteredCards = cardFiles
    .filter(f => selectedProject === "all" || f.project_path === selectedProject)
    .filter(f => selectedType === "all" || f.file_type === selectedType)
    .filter(f => selectedCat === "all" || f.category === selectedCat)
    .filter(f => !searchQuery.trim() || f.doc_title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.mtime).getTime() - new Date(a.mtime).getTime();
      if (sortBy === "views") return (b.view_count || 0) - (a.view_count || 0);
      if (sortBy === "name") return a.doc_title.localeCompare(b.doc_title, "ko");
      if (sortBy === "chunks") return b.chunk_count - a.chunk_count;
      return 0;
    });

  return (
    <div className="flex flex-col h-full">
      {/* View mode tabs */}
      <div className="border-b bg-background px-3 sm:px-4 pt-2 sm:pt-3 pb-0">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="bg-transparent h-auto p-0 gap-0">
            <TabsTrigger value="tree" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm">
              <LayoutGrid className="h-3.5 w-3.5 mr-1" /> <span className="hidden sm:inline">카드 </span>탐색
            </TabsTrigger>
            <TabsTrigger value="mindmap" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm">
              <GitBranchPlus className="h-3.5 w-3.5 mr-1" /> 마인드맵
            </TabsTrigger>
            <TabsTrigger value="knowledge-graph" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm">
              <Network className="h-3.5 w-3.5 mr-1" /> <span className="hidden sm:inline">지식 </span>그래프
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "tree" ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Filter bar */}
          <div className="border-b bg-card/80 backdrop-blur px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Search */}
              <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="문서 제목 검색..."
                  className="pl-9 h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>

              {/* Filters row - scrollable on mobile */}
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {/* Project filter */}
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-[140px] sm:w-[180px] h-8 sm:h-9 bg-background text-xs sm:text-sm shrink-0">
                    <FolderOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="사업" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">전체 사업</SelectItem>
                    {projectList.map(p => (
                      <SelectItem key={p.project_path} value={p.project_path}>
                        {p.project_path} ({p.file_count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* File type filter */}
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[100px] sm:w-[140px] h-8 sm:h-9 bg-background text-xs sm:text-sm shrink-0">
                    <ListFilter className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="유형" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {FILE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Category filter */}
                <Select value={selectedCat} onValueChange={setSelectedCat}>
                  <SelectTrigger className="w-[110px] sm:w-[140px] h-8 sm:h-9 bg-background text-xs sm:text-sm shrink-0">
                    <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="분류" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">전체 카테고리</SelectItem>
                    {catList.map(c => (
                      <SelectItem key={c.category} value={c.category}>{c.category} ({c.count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[90px] sm:w-[120px] h-8 sm:h-9 bg-background text-xs sm:text-sm shrink-0">
                    <SelectValue placeholder="정렬" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {SORT_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Result count */}
                <Badge variant="secondary" className="text-[10px] sm:text-xs ml-auto shrink-0">
                  {filteredCards.length}개
                </Badge>
              </div>
            </div>
          </div>

          {/* Card grid */}
          <div className="flex-1 overflow-auto p-3 sm:p-4">
            {filteredCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm">검색 결과가 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
                {filteredCards.map((f) => (
                  <Card
                    key={f.file_path}
                    className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
                    onClick={() => navigate(`/doc/${encodeURIComponent(f.file_path)}`)}
                  >
                    <CardContent className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
                      {/* Header: icon + type badge */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <FileTypeIcon type={f.file_type} className="h-8 w-8 shrink-0" />
                          <FileTypeBadge type={f.file_type} />
                        </div>
                        {f.doc_stage && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {f.doc_stage}
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {f.doc_title}
                      </h3>

                      {/* Project */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FolderOpen className="h-3 w-3" />
                        <span className="truncate">{f.project_path}</span>
                      </div>

                      {/* Category + Tags */}
                      <div className="flex flex-wrap gap-1">
                        {f.category && <CategoryBadge category={f.category} />}
                        {f.tags?.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Footer: meta info */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(f.mtime).toLocaleDateString("ko-KR")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {f.view_count != null && (
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-3 w-3" /> {f.view_count}
                            </span>
                          )}
                          <span>{f.chunk_count} chunks</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : viewMode === "mindmap" ? (
        <div className="flex-1 overflow-hidden bg-[hsl(222,47%,6%)] rounded-b-xl">
          {tree && <MindMap tree={tree} files={allFiles.length > 0 ? allFiles : files} />}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <KnowledgeGraphEmbed showHeader={false} />
        </div>
      )}
    </div>
  );
}
