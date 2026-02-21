import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud } from "lucide-react";
import type { WordCloudItem } from "@/lib/types";

const MOCK_WORD_DATA: WordCloudItem[] = [
  { text: "데이터", value: 120 },
  { text: "품질관리", value: 85 },
  { text: "API", value: 78 },
  { text: "클라우드", value: 72 },
  { text: "마이크로서비스", value: 65 },
  { text: "MLOps", value: 60 },
  { text: "Kubeflow", value: 55 },
  { text: "메타데이터", value: 52 },
  { text: "표준화", value: 50 },
  { text: "IoT", value: 48 },
  { text: "스마트시티", value: 45 },
  { text: "Kafka", value: 42 },
  { text: "전처리", value: 40 },
  { text: "대기질", value: 38 },
  { text: "교통", value: 36 },
  { text: "GPT-4o", value: 35 },
  { text: "K8s", value: 33 },
  { text: "eGovFrame", value: 30 },
  { text: "REST", value: 28 },
  { text: "PostgreSQL", value: 27 },
  { text: "비식별화", value: 25 },
  { text: "실시간", value: 24 },
  { text: "제로트러스트", value: 22 },
  { text: "Grafana", value: 20 },
  { text: "MinIO", value: 18 },
  { text: "Spark", value: 17 },
  { text: "MLflow", value: 16 },
  { text: "Feature Store", value: 15 },
  { text: "모니터링", value: 14 },
  { text: "파이프라인", value: 13 },
];

const PROJECT_OPTIONS = [
  { value: "all", label: "전체 프로젝트" },
  { value: "국가중점데이터", label: "국가중점데이터" },
  { value: "디지털플랫폼정부", label: "디지털플랫폼정부" },
  { value: "AI분석플랫폼", label: "AI분석플랫폼" },
  { value: "스마트시티", label: "스마트시티" },
];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.8)",
  "hsl(var(--primary) / 0.6)",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
];

export default function WordCloudPage() {
  const [project, setProject] = useState("all");
  const navigate = useNavigate();

  const maxVal = useMemo(() => Math.max(...MOCK_WORD_DATA.map((w) => w.value)), []);

  const handleWordClick = (word: string) => {
    navigate(`/?q=${encodeURIComponent(word)}`);
  };

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
            {PROJECT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex flex-wrap items-center justify-center gap-3 min-h-[320px]">
            {MOCK_WORD_DATA.map((word) => {
              const ratio = word.value / maxVal;
              const fontSize = Math.max(0.75, ratio * 2.5);
              const colorIndex = Math.min(Math.floor(ratio * COLORS.length), COLORS.length - 1);
              return (
                <button
                  key={word.text}
                  onClick={() => handleWordClick(word.text)}
                  className="transition-all hover:scale-110 hover:opacity-80 cursor-pointer font-semibold"
                  style={{
                    fontSize: `${fontSize}rem`,
                    color: COLORS[colorIndex],
                    opacity: 0.5 + ratio * 0.5,
                  }}
                >
                  {word.text}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Keywords Table */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">키워드 빈도 Top 10</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {MOCK_WORD_DATA.slice(0, 10).map((w, i) => (
              <button
                key={w.text}
                onClick={() => handleWordClick(w.text)}
                className="flex items-center gap-2 rounded-md border p-2 text-xs hover:bg-muted transition-colors cursor-pointer"
              >
                <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center text-xs p-0 shrink-0">
                  {i + 1}
                </Badge>
                <span className="truncate font-medium">{w.text}</span>
                <span className="ml-auto text-muted-foreground">{w.value}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
