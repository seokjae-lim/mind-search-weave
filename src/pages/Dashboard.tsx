import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getStats } from "@/lib/api";
import type { IndexStats, FileType } from "@/lib/types";
import { FileTypeIcon } from "@/components/FileTypeIcon";
import { Database, FileText, Clock, AlertTriangle, BarChart3, FolderOpen } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<IndexStats | null>(null);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  if (!stats) return <div className="flex h-full items-center justify-center text-muted-foreground">로딩 중...</div>;

  const typeEntries = Object.entries(stats.by_type).filter(([, v]) => v > 0) as [FileType, number][];
  const totalByType = typeEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" /> 인덱싱 현황
      </h1>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total_files}</p>
              <p className="text-xs text-muted-foreground">총 파일 수</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total_chunks.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">총 Chunk 수</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{new Date(stats.last_updated).toLocaleString("ko-KR")}</p>
              <p className="text-xs text-muted-foreground">최근 업데이트</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">파일 타입별 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {typeEntries.sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const pct = Math.round((count / totalByType) * 100);
              return (
                <div key={type} className="flex items-center gap-3">
                  <FileTypeIcon type={type as FileType} className="h-4 w-4 shrink-0" />
                  <span className="w-12 text-sm font-medium">{type.toUpperCase()}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 text-right text-sm text-muted-foreground">{count}개 ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Project Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            프로젝트별
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y">
            {stats.by_project.map((p) => (
              <div key={p.project_path} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-foreground">{p.project_path}</span>
                <span className="text-sm text-muted-foreground">{p.file_count} files / {p.chunk_count} chunks</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last indexed: {new Date(stats.last_updated).toLocaleString("ko-KR")}
          </div>
        </CardContent>
      </Card>

      {/* Failed Files */}
      {stats.failed_files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              인덱싱 실패 파일 ({stats.failed_files.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>파일 경로</TableHead>
                  <TableHead>오류</TableHead>
                  <TableHead>시도 시각</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.failed_files.map((f) => (
                  <TableRow key={f.file_path}>
                    <TableCell className="font-mono text-xs break-all">{f.file_path}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-xs">{f.error}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(f.last_attempt).toLocaleString("ko-KR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
