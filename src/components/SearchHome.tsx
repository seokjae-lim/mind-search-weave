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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      wikiStats().then((s) => setLiveStats(s)),
      wikiTrending().then((t) => setPopularDocs(t.popular?.slice(0, 6) || [])),
      wikiCategories().then((c) => setCats((c.categories || []).map(x => ({ category: x.category, count: x.count })).slice(0, 6))),
    ])
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground gap-2 py-20">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">데이터를 불러오는 중...</span>
      </div>
    );
  }

  if (error && !liveStats) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4 py-20">
        <div className="flex flex-col items-center gap-2">
          <Search className="h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">데이터를 불러올 수 없습니다</p>
          <p className="text-xs">백엔드 서버에 연결할 수 없거나 응답이 없습니다.</p>
        </div>
        <button onClick={loadData} className="text-sm text-primary hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Hero - Google style centered search */}
      <div className="text-center space-y-5 pt-2 sm:pt-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Knowledge Wiki
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5">
            컨설팅 산출물 지식 검색 플랫폼
          </p>
        </div>

        {/* Google-style search bar */}
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center rounded-full border border-border bg-card shadow-google hover:shadow-google-hover transition-shadow px-4 sm:px-5">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="검색어를 입력하세요..."
              className="flex-1 border-0 h-11 sm:h-12 text-sm sm:text-base px-3 focus-visible:ring-0 bg-transparent"
            />
            <button
              onClick={() => navigate("/advanced-search")}
              className="hidden sm:flex p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-accent"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Quick search chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {QUICK_SEARCHES.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); onSearch(s); }}
                className="inline-flex items-center gap-1 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border bg-card hover:bg-accent hover:border-accent text-foreground transition-all shadow-google hover:shadow-google-md"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards - Google style with subtle colors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: Layers, value: liveStats?.total_chunks?.toLocaleString() ?? "—", label: "문서 청크", color: "text-primary" },
          { icon: FileText, value: liveStats?.total_files?.toLocaleString() ?? "—", label: "파일 수", color: "text-green-500 dark:text-green-400" },
          { icon: Tag, value: String(cats.length || topTags.length || "—"), label: "주제분류", color: "text-amber-500 dark:text-amber-400" },
          { icon: FolderOpen, value: String(projects.length || "—"), label: "프로젝트", color: "text-violet-500 dark:text-violet-400" },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-google hover:shadow-google-md transition-shadow border-border/60">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-accent ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Three Column Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Popular Tags */}
        <Card className="shadow-google border-border/60">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
              <Tag className="h-4 w-4 text-primary" /> 인기 태그
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(liveStats?.by_category || []).slice(0, 15).map((t) => (
                <Badge
                  key={t.category}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent hover:border-primary/30 text-xs transition-colors"
                  onClick={() => { setQuery(t.category); onSearch(t.category); }}
                >
                  {t.category} {t.count}
                </Badge>
              ))}
              {(liveStats?.by_stage || []).slice(0, 8).map((s) => (
                <Badge
                  key={s.doc_stage}
                  variant="secondary"
                  className="cursor-pointer hover:bg-accent text-xs transition-colors"
                  onClick={() => { setQuery(s.doc_stage); onSearch(s.doc_stage); }}
                >
                  {s.doc_stage} {s.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="shadow-google border-border/60">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
              <Layers className="h-4 w-4 text-amber-500" /> 주제분류
            </h3>
            <div className="space-y-1">
              {cats.map((c) => (
                <div key={c.category} className="flex items-center justify-between cursor-pointer hover:bg-accent rounded-lg px-2 py-1.5 transition-colors" onClick={() => { setQuery(c.category); onSearch(c.category); }}>
                  <CategoryBadge category={c.category} />
                  <span className="text-xs text-muted-foreground font-medium">{c.count}건</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Popular Docs */}
        <Card className="shadow-google border-border/60">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
              <Eye className="h-4 w-4 text-rose-500" /> 인기 문서
            </h3>
            <div className="space-y-0.5">
              {popularDocs.map((doc, i) => (
                <div
                  key={doc.chunk_id}
                  className="flex items-center gap-2.5 cursor-pointer hover:bg-accent rounded-lg px-2 py-2 transition-colors"
                  onClick={() => navigate(`/doc/${encodeURIComponent(doc.chunk_id)}`)}
                >
                  <span className="text-xs font-bold text-muted-foreground/60 w-4 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{doc.doc_title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <FileTypeBadge type={doc.file_type as any} className="text-[9px] px-1 py-0" />
                      <span className="text-[10px] text-muted-foreground truncate">{doc.project_path}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
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
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
            <FolderOpen className="h-4 w-4 text-primary" /> 프로젝트 목록
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {projects.map((p, i) => (
              <Card
                key={p.project_path}
                className={`cursor-pointer hover:shadow-google-hover transition-all shadow-google border-border/60 ${stripeColors[i % stripeColors.length]}`}
                onClick={() => navigate(`/browse?project=${encodeURIComponent(p.project_path)}`)}
              >
                <CardContent className="p-4">
                  <p className="font-medium text-sm mb-1.5">{p.project_path}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {p.file_count} files</span>
                    <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {p.chunk_count} chunks</span>
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
