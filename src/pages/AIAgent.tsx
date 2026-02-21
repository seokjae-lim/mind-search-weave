import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Bot, User, BookOpen, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ask, embeddingStats } from "@/lib/wikiApi";
import type { AIChatMessage, AIChatReference } from "@/lib/types";
import { FileTypeBadge } from "@/components/FileTypeIcon";

export default function AIAgentPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [embedInfo, setEmbedInfo] = useState<{ total: number; coverage: number; model?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    embeddingStats().then((s) => {
      setEmbedInfo({ total: s.total_chunks, coverage: Math.round(s.coverage * 100) });
    }).catch(() => {});
  }, []);

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

  const SUGGESTIONS = ["보건복지부 데이터 현황은?", "AI 도입률이 가장 높은 분야는?", "데이터 거버넌스 성숙도 분석 결과", "클라우드 전환율은?"];

  return (
    <div className="flex h-full flex-col">
      {/* Purple Hero Header - matching wiki */}
      <div className="px-6 py-5 text-white" style={{ background: "linear-gradient(135deg, hsl(262 67% 55%), hsl(221 83% 53%))" }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Knowledge Assistant</h1>
            <p className="text-sm text-white/80">컨설팅 산출물 기반 RAG Q&A · 문서 컨텍스트로 답변합니다</p>
          </div>
        </div>
        {embedInfo && (
          <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-400" /> 임베딩: {embedInfo.total} chunks ({embedInfo.coverage}% 커버리지)</span>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">질문을 입력하면 관련 문서를 찾아 답변합니다.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="text-xs h-8 rounded-full" onClick={() => setInput(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <Bot className="h-4 w-4" />
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-xl bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-card px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="컨설팅 산출물에 대해 질문하세요...."
            className="flex-1 rounded-full"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()} className="rounded-full bg-purple-600 hover:bg-purple-700 text-white px-5">
            <Send className="h-4 w-4 mr-1" /> 질문
          </Button>
        </div>
      </div>
    </div>
  );
}
