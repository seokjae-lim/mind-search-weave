import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Copy, ExternalLink, Clock, FileText, HardDrive, ArrowLeft, SlidersHorizontal, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { searchChunks, getChunkById } from "@/lib/api";
import type { SearchResponse, SearchResult, ChunkRecord, FileType } from "@/lib/types";
import { FileTypeIcon, FileTypeBadge } from "@/components/FileTypeIcon";
import { LocationBadge } from "@/components/LocationBadge";
import { useToast } from "@/hooks/use-toast";

const FILE_TYPES: FileType[] = ["pptx", "pdf", "xlsx", "csv", "ipynb"];
const PAGE_SIZE = 5;

const RELATED_KEYWORDS: Record<string, string[]> = {
  "데이터": ["품질관리", "메타데이터", "표준화", "API", "교통"],
  "AI": ["MLOps", "Kubeflow", "GPT-4o", "전처리", "모델"],
  "클라우드": ["K8s", "마이크로서비스", "API Gateway", "제로트러스트"],
  "default": ["데이터", "AI", "클라우드", "IoT", "스마트시티"],
};

function getRelatedKeywords(query: string): string[] {
  const q = query.toLowerCase();
  for (const [key, kws] of Object.entries(RELATED_KEYWORDS)) {
    if (key !== "default" && q.includes(key.toLowerCase())) return kws;
  }
  return RELATED_KEYWORDS.default;
}

function highlightQuery(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
}

interface SearchResultsProps {
  initialResults: SearchResponse;
  initialQuery: string;
  onBack: () => void;
}

export function SearchResults({ initialResults, initialQuery, onBack }: SearchResultsProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResponse>(initialResults);
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<FileType[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "recent">("relevance");
  const [selectedChunk, setSelectedChunk] = useState<ChunkRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  const totalPages = Math.max(1, Math.ceil(results.results.length / PAGE_SIZE));
  const paginatedResults = results.results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const relatedKeywords = getRelatedKeywords(query);

  const doSearch = async (q?: string) => {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setPage(1);
    try {
      const res = await searchChunks({ query: searchQuery, types: selectedTypes.length ? selectedTypes : undefined, sort: sortBy });
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch();
  };

  const handleKeywordClick = (kw: string) => {
    setQuery(kw);
    doSearch(kw);
  };

  const openDetail = async (chunkId: string) => {
    const chunk = await getChunkById(chunkId);
    if (chunk) {
      setSelectedChunk(chunk);
      setDetailOpen(true);
    }
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast({ title: "경로 복사 완료", description: path });
  };

  const toggleType = (t: FileType) => {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  return (
    <div className="flex h-full gap-0">
      {/* Filter Panel */}
      <aside className="hidden w-56 shrink-0 border-r bg-card p-4 lg:block">
        <h3 className="mb-3 text-sm font-semibold text-foreground">필터</h3>
        <div className="mb-4">
          <Label className="mb-2 block text-xs text-muted-foreground">파일 타입</Label>
          <div className="space-y-2">
            {FILE_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selectedTypes.includes(t)} onCheckedChange={() => toggleType(t)} />
                <FileTypeIcon type={t} className="h-3.5 w-3.5" />
                <span>{t.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <Label className="mb-2 block text-xs text-muted-foreground">정렬</Label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "relevance" | "recent")}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">관련도순</SelectItem>
              <SelectItem value="recent">최근수정순</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedTypes.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setSelectedTypes([])}>
            필터 초기화
          </Button>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Search Bar */}
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-3">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="결과 내 재검색"
                className="pl-9 h-10"
              />
            </div>
            <Button onClick={() => doSearch()} disabled={loading} size="sm">
              {loading ? "검색 중..." : "검색"}
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-3xl p-4">
          {/* AI Summary Snippet */}
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-primary mb-1">AI 요약</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  '<span className="font-semibold text-foreground">{results.query}</span>' 관련하여 총 {results.total}건의 문서가 발견되었습니다.
                  {results.total > 0 && ` 주요 프로젝트: ${[...new Set(results.results.map(r => r.chunk.project_path))].slice(0, 3).join(", ")}`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Related Keywords */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">관련 키워드</p>
            <div className="flex flex-wrap gap-1.5">
              {relatedKeywords.map((kw) => (
                <Badge
                  key={kw}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                  onClick={() => handleKeywordClick(kw)}
                >
                  {kw}
                </Badge>
              ))}
            </div>
          </div>

          {/* Result Count */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              &apos;<span className="font-semibold text-foreground">{results.query}</span>&apos; 검색 결과{" "}
              <span className="font-medium text-foreground">{results.total}</span>건 · {results.took_ms}ms
            </p>
            <p className="text-xs text-muted-foreground">{page} / {totalPages} 페이지</p>
          </div>

          {results.results.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p>검색 결과가 없습니다.</p>
              <p className="text-xs mt-1">다른 키워드로 시도해보세요.</p>
            </div>
          )}

          <div className="space-y-2">
            {paginatedResults.map((r) => (
              <ResultCard key={r.chunk.chunk_id} result={r} query={query} onOpen={openDetail} onCopy={copyPath} onViewDoc={() => navigate(`/doc/${encodeURIComponent(r.chunk.file_path)}`)} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setPage(p)}
                >
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

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          {selectedChunk && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileTypeIcon type={selectedChunk.file_type} />
                  {selectedChunk.doc_title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">경로</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted rounded px-2 py-1 break-all">{selectedChunk.file_path}</code>
                    <Button size="icon" variant="ghost" onClick={() => copyPath(selectedChunk.file_path)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <FileTypeBadge type={selectedChunk.file_type} />
                  <LocationBadge location={selectedChunk.location} />
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">전체 텍스트</p>
                  <div
                    className="rounded-md border bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: highlightQuery(selectedChunk.text, query) }}
                  />
                </div>
                {selectedChunk.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">태그</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedChunk.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(selectedChunk.mtime).toLocaleString("ko-KR")}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ResultCard({ result, query, onOpen, onCopy, onViewDoc }: { result: SearchResult; query: string; onOpen: (id: string) => void; onCopy: (p: string) => void; onViewDoc: () => void }) {
  const { chunk, highlight } = result;
  const fileName = chunk.file_path.split("/").pop() || "";

  return (
    <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30" onClick={() => onOpen(chunk.chunk_id)}>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
              <FileTypeIcon type={chunk.file_type} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground truncate">{chunk.project_path}</p>
            </div>
          </div>
          <LocationBadge location={chunk.location} />
        </div>
        <p
          className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mt-1"
          dangerouslySetInnerHTML={{ __html: highlight }}
        />
        <div className="mt-3 flex items-center gap-1 border-t pt-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onCopy(chunk.file_path); }}>
            <Copy className="mr-1 h-3 w-3" /> 경로 복사
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onViewDoc(); }}>
            <ExternalLink className="mr-1 h-3 w-3" /> 문서 보기
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(fileName)}`, "_blank"); }}>
            <HardDrive className="mr-1 h-3 w-3" /> Drive
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
