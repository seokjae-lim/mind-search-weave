import { Network } from "lucide-react";
import { KnowledgeGraphEmbed } from "@/components/KnowledgeGraphEmbed";

export default function KnowledgeGraphPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background px-4 py-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Network className="h-5 w-5" /> 지식 그래프
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          프로젝트 · 문서 · 기관 · 전략 · 데이터셋 간의 온톨로지 관계를 탐색합니다
        </p>
      </div>
      <div className="flex-1">
        <KnowledgeGraphEmbed showHeader={false} />
      </div>
    </div>
  );
}
