import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, Tag, FolderOpen, FileText, Layers, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { stats as wikiStats, trending as wikiTrending, categories as wikiCategories } from "@/lib/wikiApi";
import type { WikiStatsResponse, WikiChunk } from "@/lib/wikiApi";
import { FileTypeBadge, CategoryBadge } from "@/components/FileTypeIcon";

interface SearchHomeProps {
  onSearch: (query: string, type?: string) => void;
}

const QUICK_SEARCHES = ["보건복지부", "데이터 거버넌스", "AI 도입", "클라우드", "인프라 현황"];

export function SearchHome({ onSearch }: SearchHomeProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [liveStats, setLiveStats] = useState<WikiStatsResponse | null>(null);
  const [popularDocs, setPopularDocs] = useState<WikiChunk[]>([]);
  const [cats, setCats] = useState<{ category: string; count: number }[]>([]);

  useEffect(() => {
    wikiStats().then((s) => {
      setLiveStats(s);
    }).catch(() => {});

    wikiTrending().then((t) => {
      setPopularDocs(t.popular?.slice(0, 6) || []);
    }).catch(() => {});

    wikiCategories().then((c) => {
      setCats((c.categories || []).map(x => ({ category: x.category, count: x.count })).slice(0, 6));
    }).catch(() => {});
  }, []);

  const handleSearch = () => {
    if (!query.trim()) return;
    onSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const topTags = liveStats?.by_category?.slice(0, 6) || [];
  const projects = liveStats?.by_project || [];
  const stripeColors = ["project-stripe-1", "project-stripe-2", "project-stripe-3", "project-stripe-4", "project-stripe-5"];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Search Bar */}
      <div className="flex items-stretch rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center pl-4 text-muted-foreground">
          <Search className="h-5 w-5" />
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="검색어를 입력하세요 (예: 보건복지부, 데이터 거버넌스, AI 도입...)"
          className="flex-1 border-0 h-12 text-base px-4 focus-visible:ring-0 bg-transparent"
        />
        <Button variant="ghost" onClick={() => navigate("/advanced-search")} className="h-12 px-3 text-muted-foreground hover:text-primary rounded-none border-l">
          <SlidersHorizontal className="h-4 w-4 mr-1" /> 상세
        </Button>
        <Button onClick={handleSearch} className="h-12 px-6 rounded-none text-base font-semibold bg-primary hover:bg-primary/90">
          검색
        </Button>
      </div>

      {/* Hero Banner */}
      <div className="rounded-xl p-6 text-white" style={{ background: "linear-gradient(135deg, hsl(221 83% 53%), hsl(262 67% 55%))" }}>
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-white/20 text-white border-0 text-xs">v2.0 NEW</Badge>
          <span className="text-sm text-white/80">자동 메타데이터 태깅 · DBpia 스타일</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">컨설팅 산출물 지식 검색 플랫폼</h2>
        <p className="text-sm text-white/80 mb-4 max-w-2xl">
          Google Drive의 PPT, PDF, 엑셀 등 산출물의 <strong className="text-white">내부 텍스트</strong>까지 검색하고,<br />
          <strong className="text-white">자동 태깅된 메타데이터</strong>로 주제 · 기관 · 단계별 탐색이 가능합니다.
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_SEARCHES.map((s) => (
            <Button key={s} variant="secondary" size="sm" className="bg-white/20 text-white border-0 hover:bg-white/30 text-xs h-7" onClick={() => { setQuery(s); onSearch(s); }}>
              <Search className="h-3 w-3 mr-1" /> {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <Layers className="h-5 w-5 text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{liveStats?.total_chunks?.toLocaleString() ?? "—"}</p>
            <p className="text-xs text-muted-foreground">문서 청크</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <FileText className="h-5 w-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold">{liveStats?.total_files?.toLocaleString() ?? "—"}</p>
            <p className="text-xs text-muted-foreground">파일 수</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <Tag className="h-5 w-5 text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{cats.length || topTags.length || "—"}</p>
            <p className="text-xs text-muted-foreground">주제분류</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <FolderOpen className="h-5 w-5 text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{projects.length || "—"}</p>
            <p className="text-xs text-muted-foreground">프로젝트</p>
          </CardContent>
        </Card>
      </div>

      {/* Three Column Section: Popular Tags, Categories, Popular Docs */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Popular Tags */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" /> 인기 태그
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(liveStats?.by_category || []).slice(0, 15).map((t) => (
                <Badge
                  key={t.category}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => { setQuery(t.category); onSearch(t.category); }}
                >
                  {t.category} {t.count}
                </Badge>
              ))}
              {(liveStats?.by_stage || []).slice(0, 8).map((s) => (
                <Badge
                  key={s.doc_stage}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => { setQuery(s.doc_stage); onSearch(s.doc_stage); }}
                >
                  {s.doc_stage} {s.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-orange-500" /> 주제분류
            </h3>
            <div className="space-y-2">
              {cats.map((c) => (
                <div key={c.category} className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5" onClick={() => { setQuery(c.category); onSearch(c.category); }}>
                  <CategoryBadge category={c.category} />
                  <span className="text-xs text-muted-foreground">{c.count}건</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Popular Docs */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-red-500" /> 인기 문서
            </h3>
            <div className="space-y-2">
              {popularDocs.map((doc, i) => (
                <div
                  key={doc.chunk_id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-1"
                  onClick={() => navigate(`/doc/${encodeURIComponent(doc.chunk_id)}`)}
                >
                  <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{doc.doc_title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <FileTypeBadge type={doc.file_type as any} className="text-[9px] px-1 py-0" />
                      <span className="text-[10px] text-muted-foreground truncate">{doc.project_path}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Eye className="h-3 w-3" /> {doc.view_count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      {projects.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" /> 프로젝트(사업) 목록
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {projects.map((p, i) => (
              <Card key={p.project_path} className={`cursor-pointer hover:shadow-md transition-shadow ${stripeColors[i % stripeColors.length]}`} onClick={() => navigate(`/browse?project=${encodeURIComponent(p.project_path)}`)}>
                <CardContent className="p-4">
                  <p className="font-medium text-sm mb-1">{p.project_path}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>📄 {p.file_count} files</span>
                    <span>📦 {p.chunk_count} chunks</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
