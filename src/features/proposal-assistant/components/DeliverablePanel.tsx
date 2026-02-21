import { useState } from "react";
import { FileText, Lightbulb, Calendar, Calculator, Loader2, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Requirement, Deliverable } from "../hooks/useRequirements";

interface DeliverablePanelProps {
  requirement: Requirement | null;
  deliverables: Deliverable[];
  isGenerating: string | null;
  onGenerate: (type: string) => void;
}

const DELIVERABLE_TYPES = [
  { id: "definition", label: "요구사항 정의서", icon: FileText, description: "목적, 범위, 인수기준 등" },
  { id: "proposal", label: "기술 제안서", icon: Lightbulb, description: "솔루션, 아키텍처, 구현방안" },
  { id: "wbs", label: "WBS/일정표", icon: Calendar, description: "작업분류, 마일스톤, 일정" },
  { id: "estimate", label: "견적서/비용 산정", icon: Calculator, description: "비용항목, 인력계획, 산정" },
];

export function DeliverablePanel({
  requirement,
  deliverables,
  isGenerating,
  onGenerate,
}: DeliverablePanelProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyContent = async (content: Record<string, unknown>, type: string) => {
    await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!requirement) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground p-8">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>요구사항을 선택하면</p>
          <p>산출물을 생성할 수 있습니다.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="font-mono text-primary">{requirement.requirement_number}</span>
          산출물
        </CardTitle>
        <CardDescription className="line-clamp-2">{requirement.title}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <Tabs defaultValue="generate" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">생성</TabsTrigger>
            <TabsTrigger value="view">조회</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="flex-1 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {DELIVERABLE_TYPES.map((type) => {
                const Icon = type.icon;
                const existing = deliverables.find(d => d.deliverable_type === type.id);
                const isLoading = isGenerating === `${requirement.requirement_number}-${type.id}`;
                
                return (
                  <Button
                    key={type.id}
                    variant={existing ? "secondary" : "outline"}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    disabled={!!isGenerating}
                    onClick={() => onGenerate(type.id)}
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                    <span className="text-sm font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                    {existing && (
                      <span className="text-xs text-primary">생성됨</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="view" className="flex-1 mt-4 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-400px)]">
              {deliverables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>생성된 산출물이 없습니다.</p>
                  <p className="text-sm mt-1">생성 탭에서 산출물을 생성하세요.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliverables.map((del) => (
                    <DeliverableCard
                      key={del.deliverable_type}
                      deliverable={del}
                      copied={copied === del.deliverable_type}
                      onCopy={() => copyContent(del.content, del.deliverable_type)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface DeliverableCardProps {
  deliverable: Deliverable;
  copied: boolean;
  onCopy: () => void;
}

function DeliverableCard({ deliverable, copied, onCopy }: DeliverableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const type = DELIVERABLE_TYPES.find(t => t.id === deliverable.deliverable_type);
  const Icon = type?.icon || FileText;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Icon className="w-5 h-5 text-primary" />
            <span className="flex-1 text-left font-medium">{type?.label}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 border-t">
            <ContentRenderer content={deliverable.content} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface ContentRendererProps {
  content: Record<string, unknown>;
}

function ContentRenderer({ content }: ContentRendererProps) {
  const renderValue = (value: unknown, depth = 0): React.ReactNode => {
    if (value === null || value === undefined) return null;
    
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc list-inside space-y-1 ml-2">
          {value.map((item, i) => (
            <li key={i} className="text-sm">
              {typeof item === "object" ? renderValue(item, depth + 1) : String(item)}
            </li>
          ))}
        </ul>
      );
    }
    
    if (typeof value === "object") {
      return (
        <div className={`space-y-2 ${depth > 0 ? "ml-4 border-l pl-3" : ""}`}>
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <div key={k}>
              <span className="text-xs font-medium text-muted-foreground uppercase">{formatKey(k)}</span>
              <div className="mt-0.5">{renderValue(v, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }
    
    return <span className="text-sm">{String(value)}</span>;
  };

  const formatKey = (key: string): string => {
    return key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  };

  return <div className="space-y-3">{renderValue(content)}</div>;
}
