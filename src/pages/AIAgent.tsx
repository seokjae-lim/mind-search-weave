import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Bot, User, Sparkles, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ask } from "@/lib/wikiApi";
import type { AIChatMessage, AIChatReference } from "@/lib/types";

export default function AIAgentPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "안녕하세요! Knowledge Wiki AI 에이전트입니다. 내부 축적 데이터를 기반으로 질문에 답변해 드립니다.\n\n다음과 같은 것을 물어보실 수 있습니다:\n- **프로젝트 관련 질문** (예: 국가중점데이터 사업 목표는?)\n- **기술 키워드 분석** (예: MLOps 관련 문서 알려줘)\n- **문서 요약 요청** (예: EA 현행아키텍처 요약해줘)",
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

    try {
      const res = await ask(text);
      const refs: AIChatReference[] = (res.sources || []).map((s) => ({
        chunk_id: s.chunk_id,
        doc_title: s.doc_title,
        file_path: s.file_path,
        snippet: s.summary || s.category || "",
      }));
      const assistantMsg: AIChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.answer,
        timestamp: new Date().toISOString(),
        references: refs,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "죄송합니다. 백엔드 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
          timestamp: new Date().toISOString(),
          references: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const SUGGESTIONS = ["국가중점데이터 사업 목표는?", "MLOps 파이프라인 구성 알려줘", "데이터 품질관리 방안 요약해줘"];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">AI 에이전트</h1>
            <p className="text-xs text-muted-foreground">내부 축적 데이터 기반 질의응답</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">RAG</Badge>
        </div>
      </div>

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
                        <div
                          key={ref.chunk_id}
                          className="rounded bg-background/50 px-2 py-1.5 text-xs cursor-pointer hover:bg-background/80 transition-colors"
                          onClick={() => navigate(`/doc/${encodeURIComponent(ref.file_path)}`)}
                        >
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

      {messages.length <= 1 && (
        <div className="mx-auto max-w-2xl px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">추천 질문</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Button key={s} variant="outline" size="sm" className="text-xs h-7" onClick={() => setInput(s)}>
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}

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
