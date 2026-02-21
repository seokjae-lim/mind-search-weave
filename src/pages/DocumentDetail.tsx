import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Copy, Clock, Sparkles, Eye, FileText, TrendingUp, Loader2 } from "lucide-react";
import { doc as wikiDoc, parseTags } from "@/lib/wikiApi";
import type { WikiDocDetail } from "@/lib/wikiApi";
import { FileTypeIcon, FileTypeBadge } from "@/components/FileTypeIcon";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

// AI Summary streaming via Supabase edge function
const SUMMARY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-summary`;

export default function DocumentDetailPage() {
  const { "*": splatPath } = useParams();
  const chunkId = decodeURIComponent(splatPath || "");
  const [detail, setDetail] = useState<WikiDocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // AI summary state
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryDone, setSummaryDone] = useState(false);

  useEffect(() => {
    if (!chunkId) return;
    setLoading(true);
    setSummaryText("");
    setSummaryDone(false);
    wikiDoc(chunkId).then((d) => {
      setDetail(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [chunkId]);

  const copyPath = () => {
    if (!detail) return;
    navigator.clipboard.writeText(detail.file_path);
    toast({ title: "경로 복사 완료", description: detail.file_path });
  };

  // Stream AI summary
  const requestSummary = useCallback(async () => {
    if (!detail) return;
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
          chunks: [{ text: detail.text || detail.snippet || "" }],
          docTitle: detail.doc_title,
        }),
      });

      if (!resp.ok) {
        toast({ title: "AI 요약 오류", description: "요약 생성 실패", variant: "destructive" });
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
            if (content) { accumulated += content; setSummaryText(accumulated); }
          } catch { /* partial */ }
        }
      }
      setSummaryDone(true);
    } catch {
      toast({ title: "AI 요약 오류", description: "네트워크 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setSummaryLoading(false);
    }
  }, [detail, toast]);

  if (loading) return <div className="flex h-full items-center justify-center text-muted-foreground">로딩 중...</div>;
  if (!detail) return <div className="flex h-full items-center justify-center text-muted-foreground">문서를 찾을 수 없습니다.</div>;

  const fileName = detail.file_path.split("/").pop() || "";
  const chunkTags = parseTags(detail.tags);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> 뒤로
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileTypeIcon type={detail.file_type as any} className="h-6 w-6" />
          <h1 className="text-xl font-bold">{detail.doc_title || fileName}</h1>
          <Badge>{detail.file_type.toUpperCase()}</Badge>
          {detail.category && <Badge variant="secondary">{detail.category}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted rounded px-2 py-1 break-all">{detail.file_path}</code>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyPath}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(detail.mtime).toLocaleString("ko-KR")}</span>
          {detail.org && <span>발주: {detail.org}</span>}
          {detail.doc_stage && <Badge variant="outline" className="text-[10px]">{detail.doc_stage}</Badge>}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="flex items-center gap-3 p-4"><Eye className="h-5 w-5 text-blue-500" /><div><p className="text-lg font-bold">{detail.view_count}</p><p className="text-xs text-muted-foreground">조회수</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><TrendingUp className="h-5 w-5 text-amber-500" /><div><p className="text-lg font-bold">{detail.importance}</p><p className="text-xs text-muted-foreground">중요도</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><FileText className="h-5 w-5 text-green-500" /><div><p className="text-sm font-medium">{detail.location_detail}</p><p className="text-xs text-muted-foreground">위치</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Clock className="h-5 w-5 text-purple-500" /><div><p className="text-sm font-medium">{detail.doc_year || "—"}</p><p className="text-xs text-muted-foreground">연도</p></div></CardContent></Card>
      </div>

      {/* AI Summary */}
      <Card className="mb-6 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI 요약</CardTitle>
            <Button size="sm" onClick={requestSummary} disabled={summaryLoading} className="h-8 text-xs">
              {summaryLoading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> 요약 중...</> : summaryDone ? <><Sparkles className="h-3 w-3 mr-1" /> 다시 요약</> : <><Sparkles className="h-3 w-3 mr-1" /> AI 요약 생성</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {detail.summary && !summaryText && (
            <p className="text-sm text-muted-foreground leading-relaxed">{detail.summary}</p>
          )}
          {summaryText ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{summaryText}</ReactMarkdown>
            </div>
          ) : !detail.summary && (
            <p className="text-sm text-muted-foreground text-center py-4">
              "AI 요약 생성" 버튼을 클릭하면 문서 내용을 AI가 분석하여 핵심 요약을 제공합니다.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator className="mb-4" />

      {/* Main Text */}
      <h2 className="mb-3 text-sm font-semibold">본문</h2>
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="rounded-md border bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {detail.text || detail.snippet || "텍스트가 없습니다."}
          </div>
          {chunkTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {chunkTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Documents */}
      {detail.related && detail.related.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> 같은 파일의 관련 청크
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {detail.related.map((r) => (
              <Link key={r.chunk_id} to={`/doc/${encodeURIComponent(r.chunk_id)}`} className="block">
                <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">{r.doc_title}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{r.location_detail}</Badge>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.snippet}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Similar Documents */}
      {detail.similar && detail.similar.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> 유사 문서 추천
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detail.similar.map((s) => (
              <Link key={s.chunk_id} to={`/doc/${encodeURIComponent(s.chunk_id)}`} className="block">
                <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-3 p-4">
                    <FileTypeIcon type={(s as any).file_type as any} className="h-8 w-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.doc_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.file_path}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1">{s.category}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
