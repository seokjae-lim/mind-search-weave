import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { stats as wikiStats } from "@/lib/wikiApi";
import type { WikiStatsResponse } from "@/lib/wikiApi";
import { FileTypeBadge, CategoryBadge } from "@/components/FileTypeIcon";
import { Database, FileText, Layers, FolderOpen, Eye, BarChart3, Building2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BAR_COLORS = ["bg-blue-500", "bg-green-500", "bg-red-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500", "bg-cyan-500"];
const CAT_COLORS: Record<string, string> = {
  "AI": "bg-purple-400", "데이터": "bg-green-400", "인프라": "bg-blue-400",
  "거버넌스": "bg-orange-400", "사업관리": "bg-pink-400", "전략": "bg-cyan-400",
};

export default function DashboardPage() {
  const [data, setData] = useState<WikiStatsResponse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    wikiStats().then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="flex h-full items-center justify-center text-muted-foreground">로딩 중...</div>;

  const totalByType = data.by_type.reduce((s, t) => s + t.count, 0) || 1;
  const totalByCat = data.by_category.reduce((s, c) => s + c.count, 0) || 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" /> 대시보드
      </h1>

      {/* Stats Cards - matching wiki style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <Layers className="h-5 w-5 text-blue-500 mb-2" />
            <p className="text-3xl font-bold">{data.total_chunks}</p>
            <p className="text-xs text-muted-foreground">총 청크</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <FileText className="h-5 w-5 text-green-500 mb-2" />
            <p className="text-3xl font-bold">{data.total_files}</p>
            <p className="text-xs text-muted-foreground">총 파일</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <Database className="h-5 w-5 text-orange-500 mb-2" />
            <p className="text-3xl font-bold">{data.by_category.length}</p>
            <p className="text-xs text-muted-foreground">주제분류</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <FolderOpen className="h-5 w-5 text-purple-500 mb-2" />
            <p className="text-3xl font-bold">{data.by_project.length}</p>
            <p className="text-xs text-muted-foreground">프로젝트</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column: File Types + Categories */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* File Type Bar Chart */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">📄 파일 유형별</h3>
            <div className="space-y-3">
              {data.by_type.sort((a, b) => b.count - a.count).map((t, i) => {
                const pct = Math.round((t.count / totalByType) * 100);
                return (
                  <div key={t.file_type} className="flex items-center gap-3">
                    <FileTypeBadge type={t.file_type as any} className="w-14 justify-center" />
                    <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                      <div className={`h-full rounded ${BAR_COLORS[i % BAR_COLORS.length]} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-20 text-right text-xs text-muted-foreground">{t.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Categories Chart */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">🏷 주제분류별</h3>
            <div className="space-y-3">
              {data.by_category.sort((a, b) => b.count - a.count).map((c) => {
                const pct = Math.round((c.count / totalByCat) * 100);
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <CategoryBadge category={c.category} />
                    <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                      <div className={`h-full rounded ${CAT_COLORS[c.category] || "bg-gray-400"} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-20 text-right text-xs text-muted-foreground">{c.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column: Doc Stage + Orgs */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Doc Stage */}
        {data.by_stage && data.by_stage.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">📋 문서단계별</h3>
              <div className="space-y-2">
                {data.by_stage.sort((a, b) => b.count - a.count).map((s) => (
                  <div key={s.doc_stage} className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">{s.doc_stage}</Badge>
                    <span className="text-xs text-muted-foreground">{s.count}건</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orgs */}
        {data.by_org && data.by_org.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4" /> 발주기관별</h3>
              <div className="space-y-2">
                {data.by_org.sort((a, b) => b.count - a.count).map((o) => (
                  <div key={o.org} className="flex items-center justify-between">
                    <span className="text-sm">{o.org}</span>
                    <span className="text-xs text-muted-foreground">{o.count}건</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Project Detail */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FolderOpen className="h-4 w-4 text-primary" /> 프로젝트별 상세</h3>
          <div className="divide-y">
            {data.by_project.map((p) => (
              <div key={p.project_path} className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2" onClick={() => navigate(`/browse?project=${encodeURIComponent(p.project_path)}`)}>
                <span className="text-sm font-medium">{p.project_path}</span>
                <span className="text-xs text-muted-foreground">{p.file_count} files / {p.chunk_count} chunks</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Viewed */}
      {data.top_viewed && data.top_viewed.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">🔥 인기 문서 Top 10</h3>
            <div className="space-y-2">
              {data.top_viewed.slice(0, 10).map((chunk, i) => (
                <div key={chunk.chunk_id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2" onClick={() => navigate(`/doc/${encodeURIComponent(chunk.chunk_id)}`)}>
                  <span className="text-primary font-bold w-5 text-right">{i + 1}</span>
                  <FileTypeBadge type={chunk.file_type as any} />
                  <span className="flex-1 truncate">{chunk.doc_title}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Eye className="h-3 w-3" /> {chunk.view_count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
