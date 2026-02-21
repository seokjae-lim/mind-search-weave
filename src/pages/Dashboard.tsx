import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { stats as wikiStats } from "@/lib/wikiApi";
import type { WikiStatsResponse } from "@/lib/wikiApi";
import { FileTypeIcon } from "@/components/FileTypeIcon";
import { Database, FileText, Clock, BarChart3, FolderOpen } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<WikiStatsResponse | null>(null);

  useEffect(() => {
    wikiStats().then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="flex h-full items-center justify-center text-muted-foreground">로딩 중...</div>;

  const totalByType = data.by_type.reduce((s, t) => s + t.count, 0) || 1;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" /> 인덱싱 현황
      </h1>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Database className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{data.total_files}</p><p className="text-xs text-muted-foreground">총 파일 수</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{data.total_chunks.toLocaleString()}</p><p className="text-xs text-muted-foreground">총 Chunk 수</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm font-semibold">{data.last_indexed ? new Date(data.last_indexed).toLocaleString("ko-KR") : "—"}</p><p className="text-xs text-muted-foreground">최근 인덱싱</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Type Stats */}
      <Card>
        <CardHeader><CardTitle className="text-sm">파일 타입별 통계</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.by_type.sort((a, b) => b.count - a.count).map((t) => {
              const pct = Math.round((t.count / totalByType) * 100);
              return (
                <div key={t.file_type} className="flex items-center gap-3">
                  <FileTypeIcon type={t.file_type as any} className="h-4 w-4 shrink-0" />
                  <span className="w-12 text-sm font-medium">{t.file_type.toUpperCase()}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-right text-sm text-muted-foreground">{t.count}개 ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Project Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><FolderOpen className="h-4 w-4 text-primary" />프로젝트별</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y">
            {data.by_project.map((p) => (
              <div key={p.project_path} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-foreground">{p.project_path}</span>
                <span className="text-sm text-muted-foreground">{p.file_count} files / {p.chunk_count} chunks</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Stats */}
      {data.by_category.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">주제분류별</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.by_category.map((c) => (
                <Badge key={c.category} variant="secondary">{c.category} ({c.count})</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Viewed */}
      {data.top_viewed && data.top_viewed.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">인기 문서 (조회수 기준)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.top_viewed.slice(0, 5).map((chunk, i) => (
                <div key={chunk.chunk_id} className="flex items-center gap-3 text-sm">
                  <span className="text-primary font-bold w-5">{i + 1}</span>
                  <span className="flex-1 truncate">{chunk.doc_title}</span>
                  <Badge variant="outline" className="text-[10px]">{chunk.file_type}</Badge>
                  <span className="text-muted-foreground text-xs">{chunk.view_count} views</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
