import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Copy, Clock, Sparkles, Eye, FileText, TrendingUp, Loader2 } from "lucide-react";
import { getChunksByFile } from "@/lib/api";
import type { ChunkRecord, BrowseFile } from "@/lib/types";
import { FileTypeIcon, FileTypeBadge } from "@/components/FileTypeIcon";
import { LocationBadge } from "@/components/LocationBadge";
import { useToast } from "@/hooks/use-toast";
import { MOCK_BROWSE_FILES } from "@/lib/mock-data";
import ReactMarkdown from "react-markdown";

// ─── Mock view stats ───
function useMockStats(filePath: string) {
  return {
    views: Math.floor(filePath.length * 7 + 42),
    downloads: Math.floor(filePath.length * 2 + 11),
    weeklyTrend: Math.floor(Math.random() * 30) + 5,
    lastAccessed: "2026-02-20T14:30:00",
  };
}

// ─── Related documents ───
function getRelatedDocs(currentPath: string, projectPath: string): BrowseFile[] {
  return MOCK_BROWSE_FILES
    .filter((f) => f.file_path !== currentPath)
    .filter((f) => f.project_path === projectPath || Math.random() > 0.5)
    .slice(0, 4);
}

// ─── AI Summary streaming ───
const SUMMARY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-summary`;

export default function DocumentDetailPage() {
  const { "*": splatPath } = useParams();
  const decodedPath = decodeURIComponent(splatPath || "");
  const [chunks, setChunks] = useState<ChunkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // AI summary state
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryDone, setSummaryDone] = useState(false);

  useEffect(() => {
    if (!decodedPath) return;
    setLoading(true);
    setSummaryText("");
    setSummaryDone(false);
    getChunksByFile(decodedPath).then((c) => { setChunks(c); setLoading(false); });
  }, [decodedPath]);

  const copyPath = () => {
    navigator.clipboard.writeText(decodedPath);
    toast({ title: "경로 복사 완료", description: decodedPath });
  };

  const fileName = decodedPath.split("/").pop() || "";
  const firstChunk = chunks[0];
  const projectPath = firstChunk?.project_path || decodedPath.split("/")[0];
  const stats = useMockStats(decodedPath);
  const relatedDocs = getRelatedDocs(decodedPath, projectPath);

  // ─── Stream AI summary ───
  const requestSummary = useCallback(async () => {
    if (chunks.length === 0) return;
    setSummaryLoading(true);
    setSummaryText("");
    setSummaryDone(false);

    try {
      const resp = await fetch(SUMMARY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          chunks: chunks.map((c) => ({ text: c.text })),
          docTitle: firstChunk?.doc_title || fileName,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "요약 생성 실패" }));
        toast({ title: "AI 요약 오류", description: err.error, variant: "destructive" });
        setSummaryLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setSummaryText(accumulated);
            }
          } catch { /* partial */ }
        }
      }
      setSummaryDone(true);
    } catch (e) {
      console.error(e);
      toast({ title: "AI 요약 오류", description: "네트워크 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setSummaryLoading(false);
    }
  }, [chunks, firstChunk, fileName, toast]);

  if (loading) return <div className="flex h-full items-center justify-center text-muted-foreground">로딩 중...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> 뒤로
      </Button>

      {/* ─── Header ─── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {firstChunk && <FileTypeIcon type={firstChunk.file_type} className="h-6 w-6" />}
          <h1 className="text-xl font-bold">{fileName}</h1>
          {firstChunk && <FileTypeBadge type={firstChunk.file_type} />}
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted rounded px-2 py-1 break-all">{decodedPath}</code>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyPath}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        {firstChunk && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(firstChunk.mtime).toLocaleString("ko-KR")}
          </div>
        )}
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-lg font-bold">{stats.views}</p>
              <p className="text-xs text-muted-foreground">조회수</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-lg font-bold">{stats.downloads}</p>
              <p className="text-xs text-muted-foreground">다운로드</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-lg font-bold">+{stats.weeklyTrend}%</p>
              <p className="text-xs text-muted-foreground">주간 추세</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm font-medium">{chunks.length}</p>
              <p className="text-xs text-muted-foreground">총 청크</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── AI Summary ─── */}
      <Card className="mb-6 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI 요약
            </CardTitle>
            <Button
              size="sm"
              onClick={requestSummary}
              disabled={summaryLoading || chunks.length === 0}
              className="h-8 text-xs"
            >
              {summaryLoading ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> 요약 중...</>
              ) : summaryDone ? (
                <><Sparkles className="h-3 w-3 mr-1" /> 다시 요약</>
              ) : (
                <><Sparkles className="h-3 w-3 mr-1" /> AI 요약 생성</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {summaryText ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{summaryText}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              "AI 요약 생성" 버튼을 클릭하면 문서 내용을 AI가 분석하여 핵심 요약을 제공합니다.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator className="mb-4" />

      {/* ─── Chunks ─── */}
      <h2 className="mb-3 text-sm font-semibold">Chunks ({chunks.length})</h2>

      {chunks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">이 파일의 인덱싱된 chunk가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {chunks.map((c) => (
            <Card key={c.chunk_id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <LocationBadge location={c.location} />
                  {c.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
                <div className="rounded-md border bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {c.text}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Related Documents ─── */}
      <Separator className="my-6" />
      <h2 className="mb-3 text-sm font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4" /> 관련 문서 추천
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {relatedDocs.map((doc) => (
          <Link
            key={doc.file_path}
            to={`/doc/${encodeURIComponent(doc.file_path)}`}
            className="block"
          >
            <Card className="hover:border-primary/40 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <FileTypeIcon type={doc.file_type} className="h-8 w-8 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.doc_title}</p>
                  <p className="text-xs text-muted-foreground truncate">{doc.file_path}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{doc.project_path}</Badge>
                    <span className="text-[10px] text-muted-foreground">{doc.chunk_count} chunks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
