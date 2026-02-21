import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, X, Send, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AIChatFAB() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const navigate = useNavigate();

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
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Mini Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl border bg-card shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">AI 검색</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToAgent}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
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
