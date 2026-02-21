import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Copy, Clock } from "lucide-react";
import { getChunksByFile } from "@/lib/api";
import type { ChunkRecord } from "@/lib/types";
import { FileTypeIcon, FileTypeBadge } from "@/components/FileTypeIcon";
import { LocationBadge } from "@/components/LocationBadge";
import { useToast } from "@/hooks/use-toast";

export default function DocumentDetailPage() {
  const { filePath } = useParams<{ filePath: string }>();
  const decodedPath = decodeURIComponent(filePath || "");
  const [chunks, setChunks] = useState<ChunkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!decodedPath) return;
    setLoading(true);
    getChunksByFile(decodedPath).then((c) => { setChunks(c); setLoading(false); });
  }, [decodedPath]);

  const copyPath = () => {
    navigator.clipboard.writeText(decodedPath);
    toast({ title: "경로 복사 완료", description: decodedPath });
  };

  const fileName = decodedPath.split("/").pop() || "";
  const firstChunk = chunks[0];

  if (loading) return <div className="flex h-full items-center justify-center text-muted-foreground">로딩 중...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> 뒤로
      </Button>

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

      <Separator className="mb-4" />

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
    </div>
  );
}
