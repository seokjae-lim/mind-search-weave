import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Copy, ExternalLink, Clock, FileText, HardDrive } from "lucide-react";
import { searchChunks, getChunkById } from "@/lib/api";
import type { SearchResponse, SearchResult, ChunkRecord, FileType, SearchFilters } from "@/lib/types";
import { FileTypeIcon, FileTypeBadge } from "@/components/FileTypeIcon";
import { LocationBadge } from "@/components/LocationBadge";
import { useToast } from "@/hooks/use-toast";

const FILE_TYPES: FileType[] = ["pptx", "pdf", "xlsx", "csv", "ipynb"];

function highlightQuery(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<FileType[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "recent">("relevance");
  const [selectedChunk, setSelectedChunk] = useState<ChunkRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const doSearch = async (q?: string) => {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearchParams({ q: searchQuery });
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

  // If we have an initial query but no results, run search on mount
  useState(() => {
    if (initialQuery) doSearch(initialQuery);
  });

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
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
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
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="키워드 검색 (기관명, 시스템명, 데이터명 등)"
                className="pl-9"
              />
            </div>
            <Button onClick={() => doSearch()} disabled={loading}>
              {loading ? "검색 중..." : "검색"}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="mx-auto max-w-3xl p-4">
          {!results && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h2 className="mb-2 text-lg font-semibold text-foreground">컨설팅 산출물을 검색하세요</h2>
              <p className="text-sm text-muted-foreground">
                기관명, 시스템명, 데이터명 등 키워드를 입력하면<br />
                PPT/PDF/Excel 내부 텍스트까지 위치와 함께 찾아줍니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {["NIA", "교통사고", "Kubeflow", "품질관리", "eGovFrame"].map((kw) => (
                  <Badge
                    key={kw}
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => { setQuery(kw); doSearch(kw); }}
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {results && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{results.total}</span>개 결과 · {results.took_ms}ms
                </p>
              </div>

              {results.results.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p>검색 결과가 없습니다.</p>
                </div>
              )}

              <div className="space-y-3">
                {results.results.map((r) => (
                  <ResultCard key={r.chunk.chunk_id} result={r} onOpen={openDetail} onCopy={copyPath} onViewDoc={() => navigate(`/doc/${encodeURIComponent(r.chunk.file_path)}`)} />
                ))}
              </div>
            </>
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
                    className="rounded-md border bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap [&_mark]:bg-highlight [&_mark]:text-highlight-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
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

function ResultCard({ result, onOpen, onCopy, onViewDoc }: { result: SearchResult; onOpen: (id: string) => void; onCopy: (p: string) => void; onViewDoc: () => void }) {
  const { chunk, highlight } = result;
  const fileName = chunk.file_path.split("/").pop() || "";

  return (
    <Card className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => onOpen(chunk.chunk_id)}>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileTypeIcon type={chunk.file_type} className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground truncate">{chunk.project_path}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <LocationBadge location={chunk.location} />
          </div>
        </div>
        <p
          className="text-sm text-muted-foreground leading-relaxed line-clamp-3"
          dangerouslySetInnerHTML={{ __html: highlight }}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onCopy(chunk.file_path); }}
          >
            <Copy className="mr-1 h-3 w-3" /> 경로 복사
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onViewDoc(); }}
          >
            <ExternalLink className="mr-1 h-3 w-3" /> 문서 보기
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(fileName)}`, "_blank"); }}
          >
            <HardDrive className="mr-1 h-3 w-3" /> Drive에서 열기
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
