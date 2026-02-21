import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Copy, ExternalLink, Clock, FileText, HardDrive, Star, Eye, ChevronLeft, ChevronRight, FolderOpen, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { search as wikiSearch, doc as wikiDoc, parseTags, projects as apiProjects, categories as apiCategories } from "@/lib/wikiApi";
import type { WikiSearchResponse, WikiChunk, WikiDocDetail } from "@/lib/wikiApi";
import { FileTypeBadge, CategoryBadge } from "@/components/FileTypeIcon";
import { useToast } from "@/hooks/use-toast";

const FILE_TYPES = ["pptx", "pdf", "xlsx", "csv", "ipynb"];

interface SearchResultsProps {
  initialResults: WikiSearchResponse;
  initialQuery: string;
  onBack: () => void;
}

export function SearchResults({ initialResults, initialQuery, onBack }: SearchResultsProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<WikiSearchResponse>(initialResults);
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [selectedChunk, setSelectedChunk] = useState<WikiDocDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [projectList, setProjectList] = useState<{ project_path: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("전체 사업");
  const [catList, setCatList] = useState<{ category: string; count: number }[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("전체");
  const { toast } = useToast();
  const navigate = useNavigate();

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(results.results.length / PAGE_SIZE));
  const paginatedResults = results.results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    apiProjects().then((r) => setProjectList(r.projects || [])).catch(() => {});
    apiCategories().then((r) => setCatList((r.categories || []).map(c => ({ category: c.category, count: c.count })))).catch(() => {});
  }, []);

  const doSearch = async (q?: string) => {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setPage(1);
    try {
      const res = await wikiSearch({
        q: searchQuery,
        type: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
        project: selectedProject !== "전체 사업" ? selectedProject : undefined,
        category: selectedCat !== "전체" ? selectedCat : undefined,
        sort: sortBy,
      });
      setResults(res);
    } catch {} finally {
      setLoading(false);
    }
  };

  const openDetail = async (chunkId: string) => {
    try {
      const detail = await wikiDoc(chunkId);
      setSelectedChunk(detail);
      setDetailOpen(true);
    } catch {}
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast({ title: "경로 복사 완료", description: path });
  };

  const toggleType = (t: string) => {
    if (selectedTypes.includes(t)) {
      setSelectedTypes(selectedTypes.filter(x => x !== t));
    } else {
      setSelectedTypes([t]);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Filter Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 border-r bg-card overflow-auto">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-5">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">▼ 필터</h4>
            </div>

            {/* File Type Filter */}
            <div>
              <h4 className="text-xs font-semibold mb-2">파일 유형</h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  className={`text-[11px] px-2 py-1 rounded border font-medium transition-colors ${selectedTypes.length === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}
                  onClick={() => setSelectedTypes([])}
                >전체</button>
                {FILE_TYPES.map((t) => (
                  <button
                    key={t}
                    className={`text-[11px] px-2 py-1 rounded border font-medium transition-colors ${selectedTypes.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}
                    onClick={() => toggleType(t)}
                  >
                    {t === "pptx" ? "🅿 PPT" : t === "pdf" ? "📄 PDF" : t === "xlsx" ? "📊 Excel" : t === "csv" ? "📊 CSV" : "💻 NB"}
                  </button>
                ))}
              </div>
            </div>

            {/* Project Filter */}
            <div>
              <h4 className="text-xs font-semibold mb-2">프로젝트</h4>
              <div className="space-y-1">
                <button
                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${selectedProject === "전체 사업" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => { setSelectedProject("전체 사업"); }}
                >전체 사업</button>
                {projectList.map((p) => (
                  <button
                    key={p.project_path}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center gap-1 ${selectedProject === p.project_path ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onClick={() => setSelectedProject(p.project_path)}
                  >
                    <FolderOpen className="h-3 w-3 shrink-0" /> {p.project_path}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <h4 className="text-xs font-semibold mb-2">주제분류</h4>
              <div className="space-y-1">
                <button
                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${selectedCat === "전체" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setSelectedCat("전체")}
                >전체</button>
                {catList.map((c) => (
                  <button
                    key={c.category}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center justify-between transition-colors ${selectedCat === c.category ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onClick={() => setSelectedCat(c.category)}
                  >
                    <span>{c.category}</span>
                    <span className="text-[10px]">({c.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <h4 className="text-xs font-semibold mb-2">정렬</h4>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">관련도순</SelectItem>
                  <SelectItem value="mtime">최근 수정순</SelectItem>
                  <SelectItem value="views">인기순</SelectItem>
                  <SelectItem value="importance">중요도순</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => doSearch()}>
              필터 적용
            </Button>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Search Bar */}
        <div className="sticky top-0 z-10 border-b bg-background px-4 py-3">
          <div className="max-w-4xl flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="검색어 입력" className="pl-9 h-10" />
            </div>
            <Button onClick={() => doSearch()} disabled={loading} className="h-10 px-5">
              {loading ? "검색 중..." : "검색"}
            </Button>
          </div>
        </div>

        <div className="max-w-4xl px-4 py-4">
          {/* Result Count */}
          <div className="mb-4">
            <p className="text-sm">
              &quot;<span className="font-bold text-foreground">{results.query}</span>&quot; 검색결과{" "}
              <span className="font-bold text-primary">{results.total}건</span>
              {selectedTypes.length === 1 && <Badge variant="outline" className="ml-2 text-xs">{selectedTypes[0].toUpperCase()}</Badge>}
            </p>
          </div>

          {results.results.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm">검색 결과가 없습니다.</p>
            </div>
          )}

          <div className="space-y-4">
            {paginatedResults.map((chunk) => (
              <WikiResultCard key={chunk.chunk_id} chunk={chunk} onOpen={openDetail} onCopy={copyPath} onViewDoc={() => navigate(`/doc/${encodeURIComponent(chunk.chunk_id)}`)} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(p)}>
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Sheet (right panel) */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-auto">
          {selectedChunk && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">📄 문서 상세</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <h3 className="text-lg font-bold">{selectedChunk.doc_title}</h3>
                <div className="flex flex-wrap gap-1.5">
                  <FileTypeBadge type={selectedChunk.file_type as any} />
                  <Badge variant="outline" className="text-xs">{selectedChunk.location_detail}</Badge>
                  {selectedChunk.category && <CategoryBadge category={selectedChunk.category} />}
                  {selectedChunk.doc_stage && <Badge variant="secondary" className="text-xs">{selectedChunk.doc_stage}</Badge>}
                </div>

                {selectedChunk.summary && (
                  <div className="rounded-lg border bg-green-50 p-3">
                    <p className="text-xs font-medium text-green-700 mb-1">🧠 요약</p>
                    <p className="text-sm text-green-800">{selectedChunk.summary}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">경로</span><p className="font-medium truncate">{selectedChunk.file_path}</p></div>
                  <div><span className="text-muted-foreground">프로젝트</span><p className="font-medium">{selectedChunk.project_path}</p></div>
                  <div><span className="text-muted-foreground">작성기관</span><p className="font-medium">{selectedChunk.org || "—"}</p></div>
                  <div><span className="text-muted-foreground">사업연도</span><p className="font-medium">{selectedChunk.doc_year || "—"}</p></div>
                  <div><span className="text-muted-foreground">수정일</span><p className="font-medium">{new Date(selectedChunk.mtime).toLocaleDateString("ko-KR")}</p></div>
                  <div><span className="text-muted-foreground">중요도</span><p className="font-medium">{selectedChunk.importance}/100</p></div>
                </div>

                {/* Importance Bar */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">중요도</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${selectedChunk.importance}%` }} />
                  </div>
                </div>

                {/* Tags */}
                {parseTags(selectedChunk.tags).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">🏷 태그</p>
                    <div className="flex flex-wrap gap-1">
                      {parseTags(selectedChunk.tags).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Full Text */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">📝 전체 텍스트</p>
                  <div className="rounded border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-auto">
                    {selectedChunk.text || selectedChunk.snippet}
                  </div>
                </div>

                {/* Related docs */}
                {selectedChunk.related && selectedChunk.related.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">📎 같은 파일의 다른 위치</p>
                    <div className="space-y-1">
                      {selectedChunk.related.slice(0, 5).map((r) => (
                        <div key={r.chunk_id} className="text-xs p-1.5 rounded bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => navigate(`/doc/${encodeURIComponent(r.chunk_id)}`)}>{r.location_detail} — {r.snippet?.slice(0, 60)}...</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Similar docs */}
                {selectedChunk.similar && selectedChunk.similar.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">🔍 유사 주제 문서</p>
                    <div className="space-y-1">
                      {selectedChunk.similar.slice(0, 5).map((s) => (
                        <div key={s.chunk_id} className="text-xs p-1.5 rounded bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => navigate(`/doc/${encodeURIComponent(s.chunk_id)}`)}>
                          {s.doc_title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyPath(selectedChunk.file_path)}>
                    <Copy className="h-3 w-3 mr-1" /> 경로 복사
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const fn = selectedChunk.file_path.split("/").pop() || selectedChunk.doc_title;
                    window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(fn)}`, "_blank");
                  }}>
                    <HardDrive className="h-3 w-3 mr-1" /> Drive에서 열기
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Wiki-style Result Card ── */
function WikiResultCard({ chunk, onOpen, onCopy, onViewDoc }: { chunk: WikiChunk; onOpen: (id: string) => void; onCopy: (p: string) => void; onViewDoc: () => void }) {
  const displayText = chunk.snippet || chunk.text?.substring(0, 300) || "";
  const tags = parseTags(chunk.tags);

  return (
    <div className="group border-b pb-4 cursor-pointer" onClick={() => onOpen(chunk.chunk_id)}>
      {/* Header Row: icon + title */}
      <div className="flex items-start gap-2 mb-1.5">
        <div className="mt-0.5 text-primary">
          {chunk.file_type === "pptx" ? "📊" : chunk.file_type === "pdf" ? "📄" : chunk.file_type === "xlsx" || chunk.file_type === "csv" ? "📈" : chunk.file_type === "ipynb" ? "💻" : "📁"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{chunk.doc_title}</h3>
          {/* Meta Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <FileTypeBadge type={chunk.file_type as any} />
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{chunk.location_detail}</Badge>
            {chunk.category && <CategoryBadge category={chunk.category} />}
            {chunk.doc_stage && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{chunk.doc_stage}</Badge>}
            {chunk.org && <span className="text-[10px] text-muted-foreground">🏛 {chunk.org}</span>}
          </div>
          {/* File Path */}
          <p className="text-xs text-muted-foreground mt-1 truncate">{chunk.project_path}/{chunk.file_path.split("/").pop()}</p>
        </div>
        <Button size="icon" variant="ghost" className="shrink-0 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onCopy(chunk.file_path); }}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Snippet */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 ml-7" dangerouslySetInnerHTML={{ __html: displayText }} />

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 ml-7">
          {tags.slice(0, 6).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Footer Stats */}
      <div className="flex items-center gap-3 mt-2 ml-7 text-[11px] text-muted-foreground">
        {chunk.similarity != null && <span className="text-green-600 font-medium">⚡ {Math.round(chunk.similarity * 100)}%</span>}
        <span className="flex items-center gap-0.5"><Star className="h-3 w-3" /> {chunk.importance}</span>
        <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {chunk.view_count}</span>
        <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {new Date(chunk.mtime).toLocaleDateString("ko-KR")}</span>
        <span className="ml-auto text-muted-foreground">{chunk.project_path}</span>
      </div>
    </div>
  );
}
