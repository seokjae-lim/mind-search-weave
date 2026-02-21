import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, Loader2 } from "lucide-react";
import { tags as apiTags, projects as apiProjects } from "@/lib/wikiApi";
import type { WikiTagItem } from "@/lib/wikiApi";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.8)",
  "hsl(var(--primary) / 0.6)",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
];

export default function WordCloudPage() {
  const [project, setProject] = useState("all");
  const [projectOptions, setProjectOptions] = useState<{ value: string; label: string }[]>([{ value: "all", label: "전체 프로젝트" }]);
  const [wordData, setWordData] = useState<WikiTagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      apiTags().then((r) => setWordData(r.tags || [])),
      apiProjects().then((r) => {
        setProjectOptions([
          { value: "all", label: "전체 프로젝트" },
          ...r.projects.map((p) => ({ value: p.project_path, label: p.project_path })),
        ]);
      }),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const maxVal = useMemo(() => Math.max(...wordData.map((w) => w.count), 1), [wordData]);

  const handleWordClick = (word: string) => {
    navigate(`/?q=${encodeURIComponent(word)}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Cloud className="h-5 w-5" /> 워드 클라우드
          </h1>
          <p className="text-sm text-muted-foreground mt-1">프로젝트 내 키워드 빈도를 시각화합니다</p>
        </div>
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-44 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {projectOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex flex-wrap items-center justify-center gap-3 min-h-[320px]">
            {wordData.length === 0 && (
              <p className="text-sm text-muted-foreground">태그 데이터가 없습니다</p>
            )}
            {wordData.map((word) => {
              const ratio = word.count / maxVal;
              const fontSize = Math.max(0.75, ratio * 2.5);
              const colorIndex = Math.min(Math.floor(ratio * COLORS.length), COLORS.length - 1);
              return (
                <button
                  key={word.tag}
                  onClick={() => handleWordClick(word.tag)}
                  className="transition-all hover:scale-110 hover:opacity-80 cursor-pointer font-semibold"
                  style={{
                    fontSize: `${fontSize}rem`,
                    color: COLORS[colorIndex],
                    opacity: 0.5 + ratio * 0.5,
                  }}
                >
                  {word.tag}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">키워드 빈도 Top 10</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {wordData.slice(0, 10).map((w, i) => (
              <button
                key={w.tag}
                onClick={() => handleWordClick(w.tag)}
                className="flex items-center gap-2 rounded-md border p-2 text-xs hover:bg-muted transition-colors cursor-pointer"
              >
                <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center text-xs p-0 shrink-0">
                  {i + 1}
                </Badge>
                <span className="truncate font-medium">{w.tag}</span>
                <span className="ml-auto text-muted-foreground">{w.count}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
