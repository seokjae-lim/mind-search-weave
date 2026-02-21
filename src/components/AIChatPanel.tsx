import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, X, Send, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AIChatFAB() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  // Drag state
  const [pos, setPos] = useState({ x: 24, y: 24 }); // bottom-right offsets
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

  const goToAgent = () => {
    if (input.trim()) {
      navigate(`/ai-agent?q=${encodeURIComponent(input.trim())}`);
    } else {
      navigate("/ai-agent");
    }
    setOpen(false);
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ right: pos.x, bottom: pos.y }}
          className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-shadow hover:shadow-xl active:shadow-md cursor-grab active:cursor-grabbing touch-none"
        >
          <Bot className="h-6 w-6 pointer-events-none" />
        </button>
      )}

      {/* Mini Panel */}
      {open && (
        <div
          style={{ right: pos.x, bottom: pos.y }}
          className="fixed z-50 w-80 rounded-xl border bg-card shadow-2xl animate-in slide-in-from-bottom-4"
        >
          {/* Draggable header */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex items-center justify-between border-b px-4 py-3 cursor-grab active:cursor-grabbing touch-none select-none"
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">AI 검색</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goToAgent}>
                <Maximize2 className="h-3 w-3" />
              </Button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-3">
              내부 축적 데이터를 기반으로 AI가 답변합니다.
            </p>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goToAgent()}
                placeholder="질문을 입력하세요..."
                className="h-9 text-sm"
              />
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={goToAgent}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
