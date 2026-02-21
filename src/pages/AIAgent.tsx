import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { AIChatMessage, AIChatReference } from "@/lib/types";

const MOCK_RESPONSES: Record<string, { content: string; references: AIChatReference[] }> = {
  default: {
    content:
      "안녕하세요! Knowledge Wiki AI 에이전트입니다. 내부 축적 데이터를 기반으로 질문에 답변해 드립니다.\n\n다음과 같은 것을 물어보실 수 있습니다:\n- **프로젝트 관련 질문** (예: 국가중점데이터 사업 목표는?)\n- **기술 키워드 분석** (예: MLOps 관련 문서 알려줘)\n- **문서 요약 요청** (예: EA 현행아키텍처 요약해줘)",
    references: [],
  },
  데이터: {
    content:
      "내부 데이터를 분석한 결과, **데이터** 관련 주요 내용은 다음과 같습니다:\n\n1. **국가중점데이터 사업**: 15개 분야 데이터셋 대상, NIA 발주 (2025)\n2. **데이터 품질관리**: 품질진단 자동화, 메타데이터 표준화, 모니터링 대시보드\n3. **교통 데이터**: 한국교통안전공단 연간 200만건, CSV 형태 저장\n4. **대기질 데이터**: 전국 650개 측정소 실시간 수집, REST API 제공\n\n특히 **데이터 표준화**와 **품질관리** 분야가 핵심 주제로 나타납니다.",
    references: [
      { chunk_id: "c001", doc_title: "최종보고", file_path: "국가중점데이터/03.제안서/최종본/최종보고.pptx", snippet: "국가중점데이터 구축 사업의 핵심 목표는..." },
      { chunk_id: "c002", doc_title: "최종보고", file_path: "국가중점데이터/03.제안서/최종본/최종보고.pptx", snippet: "데이터 품질관리 체계 구축 방안..." },
      { chunk_id: "c003", doc_title: "기관현황조사", file_path: "국가중점데이터/04.수행/현황분석/기관현황조사.pdf", snippet: "한국교통안전공단의 교통사고 데이터..." },
    ],
  },
  AI: {
    content:
      "AI 관련 내부 축적 데이터 분석 결과입니다:\n\n### MLOps 파이프라인\n- **Kubeflow** 기반 모델 학습/배포 자동화\n- **Feature Store**: Feast 도입\n- **모델 관리**: MLflow 활용\n- GPU 클러스터(A100 x 8) 분산 학습\n\n### 모델 성능 비교\n| 모델 | 정확도 | F1 | 지연시간 |\n|------|--------|-----|----------|\n| GPT-4o | 0.94 | 0.92 | 320ms |\n\n### 데이터 전처리\nKoNLPy 기반 한국어 형태소 분석 파이프라인 구축",
    references: [
      { chunk_id: "c009", doc_title: "AI플랫폼_제안서", file_path: "AI분석플랫폼/03.제안서/AI플랫폼_제안서.pptx", snippet: "MLOps 파이프라인 구축 방안..." },
      { chunk_id: "c010", doc_title: "모델성능비교", file_path: "AI분석플랫폼/05.분석/모델성능비교.csv", snippet: "GPT-4o | 텍스트분류 | Accuracy: 0.94..." },
    ],
  },
};

function getMockResponse(query: string): { content: string; references: AIChatReference[] } {
  const q = query.toLowerCase();
  if (q.includes("데이터") || q.includes("품질") || q.includes("nla") || q.includes("교통")) return MOCK_RESPONSES["데이터"];
  if (q.includes("ai") || q.includes("mlops") || q.includes("kubeflow") || q.includes("모델")) return MOCK_RESPONSES["AI"];
  return MOCK_RESPONSES["default"];
}

export default function AIAgentPage() {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: MOCK_RESPONSES.default.content,
      timestamp: new Date().toISOString(),
      references: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: AIChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response delay
    await new Promise((r) => setTimeout(r, 1200));
    const mock = getMockResponse(text);

    const assistantMsg: AIChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: mock.content,
      timestamp: new Date().toISOString(),
      references: mock.references,
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(false);
  };

  const SUGGESTIONS = ["국가중점데이터 사업 목표는?", "MLOps 파이프라인 구성 알려줘", "데이터 품질관리 방안 요약해줘"];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">AI 에이전트</h1>
            <p className="text-xs text-muted-foreground">내부 축적 데이터 기반 질의응답</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">Mock 모드</Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                {msg.references && msg.references.length > 0 && (
                  <div className="mt-3 border-t pt-2">
                    <p className="text-xs font-medium mb-1.5 flex items-center gap-1 opacity-70">
                      <BookOpen className="h-3 w-3" /> 참고 문서
                    </p>
                    <div className="space-y-1.5">
                      {msg.references.map((ref) => (
                        <div key={ref.chunk_id} className="rounded bg-background/50 px-2 py-1.5 text-xs">
                          <p className="font-medium">{ref.doc_title}</p>
                          <p className="text-muted-foreground truncate">{ref.file_path}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="rounded-xl bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mx-auto max-w-2xl px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">추천 질문</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => { setInput(s); }}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-background px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="질문을 입력하세요..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
