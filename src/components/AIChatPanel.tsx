import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, X, Send, Maximize2, Sparkles, User, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ask } from "@/lib/wikiApi";
import type { AIChatMessage, AIChatReference } from "@/lib/types";

export function AIChatFAB() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "안녕하세요! Knowledge Wiki AI입니다. 내부 축적 데이터를 기반으로 답변해 드립니다.",
      timestamp: new Date().toISOString(),
      references: [],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = dragStart.current.mx - e.clientX;
    const dy = dragStart.current.my - e.clientY;
    setPos({
      x: Math.max(0, dragStart.current.px + dx),
      y: Math.max(0, dragStart.current.py + dy),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
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
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          timestamp: new Date().toISOString(),
          references: refs,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "백엔드 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
          timestamp: new Date().toISOString(),
          references: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const goToAgent = () => {
    navigate("/ai-agent");
    setOpen(false);
  };

  return (
    <>
      {!open && (
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => setOpen(true)}
          style={{ right: pos.x, bottom: pos.y }}
          className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-shadow hover:shadow-xl active:shadow-md cursor-grab active:cursor-grabbing touch-none"
        >
          <Bot className="h-6 w-6 pointer-events-none" />
        </button>
      )}

      {open && (
        <div
          style={{ right: pos.x, bottom: pos.y }}
          className="fixed z-50 w-[360px] h-[520px] flex flex-col rounded-2xl border bg-card shadow-2xl animate-in slide-in-from-bottom-4 overflow-hidden"
        >
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex items-center justify-between border-b px-4 py-2.5 cursor-grab active:cursor-grabbing touch-none select-none shrink-0 bg-card"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold">AI 챗봇</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToAgent} title="전체 화면">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <button onClick={() => setOpen(false)} className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.references && msg.references.length > 0 && (
                      <div className="mt-2 border-t border-border/50 pt-1.5">
                        <p className="text-[10px] font-medium flex items-center gap-1 opacity-60 mb-1">
                          <BookOpen className="h-2.5 w-2.5" /> 참고 문서
                        </p>
                        {msg.references.map((ref) => (
                          <div
                            key={ref.chunk_id}
                            className="rounded bg-background/50 px-1.5 py-1 text-[10px] mb-1 cursor-pointer hover:bg-background/80 transition-colors"
                            onClick={() => navigate(`/doc/${encodeURIComponent(ref.file_path)}`)}
                          >
                            <p className="font-medium truncate">{ref.doc_title}</p>
                            <p className="text-muted-foreground truncate">{ref.file_path}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground mt-0.5">
                      <User className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="border-t px-3 py-2.5 shrink-0 bg-card">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="질문을 입력하세요..."
                className="h-8 text-xs flex-1"
                disabled={isLoading}
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendMessage} disabled={isLoading || !input.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
