import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Send,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { internalActions, externalTools, type QuickAction } from "./integrations";

export default function AgentHubPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const handleAction = (action: QuickAction) => {
    if (action.category === "external" && action.externalUrl) {
      const url = query.trim()
        ? `${action.externalUrl}${encodeURIComponent(query.trim())}`
        : action.externalUrl;
      window.open(url, "_blank", "noopener");
    } else if (action.route) {
      navigate(action.route);
    }
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    // Default action: navigate to wiki search with query
    navigate(`/?q=${encodeURIComponent(query.trim())}`);
  };

  const handleCopy = async () => {
    if (!query.trim()) return;
    await navigator.clipboard.writeText(query.trim());
    setCopied(true);
    toast.success("검색어가 클립보드에 복사되었습니다.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI 에이전트 허브</h1>
            <p className="text-sm text-muted-foreground">
              내부 산출물 검색부터 외부 딥리서치까지, 하나의 진입점에서 시작하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Input area */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="질문이나 검색어를 입력하세요… (예: 국가중점데이터 사업 목표, MLOps 파이프라인 구성)"
            className="min-h-[80px] resize-none border-0 p-0 text-base focus-visible:ring-0 shadow-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!query.trim()}
                className="gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "복사됨" : "검색어 복사"}
              </Button>
            </div>
            <Button onClick={handleSubmit} disabled={!query.trim()} className="gap-1.5">
              <Send className="h-4 w-4" />
              내부 검색 실행
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">빠른 작업</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {internalActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className="group flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <action.icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div>
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  {action.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <Separator />

      {/* External Tools */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">연동 도구</h2>
          <Badge variant="secondary" className="text-xs">External</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          위 입력창에 검색어를 입력한 뒤 아래 도구를 클릭하면 해당 서비스에서 바로 검색할 수 있습니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {externalTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleAction(tool)}
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <tool.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{tool.title}</p>
                <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
