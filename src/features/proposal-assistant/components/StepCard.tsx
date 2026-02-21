import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, RotateCcw, Loader2, History, TrendingUp, TrendingDown, Sparkles, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalysisVersion } from "../contexts/AnalysisContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ReanalysisDialog } from "./ReanalysisDialog";
import { VersionCompareDialog } from "./VersionCompareDialog";

interface StepCardProps {
  stepNumber: number;
  title: string;
  description: string;
  content: React.ReactNode;
  isActive: boolean;
  isLoading?: boolean;
  onReanalyze?: (customPrompt?: string) => void;
  currentVersion?: number;
  history?: AnalysisVersion[];
  improvements?: { strengths?: string[]; weaknesses?: string[]; changes?: string[] };
  currentData?: Record<string, unknown>;
}

const StepCard = ({
  stepNumber, title, description, content, isActive, isLoading = false,
  onReanalyze, currentVersion = 1, history = [], improvements, currentData,
}: StepCardProps) => {
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showImprovements, setShowImprovements] = useState(true);
  const [showReanalysisDialog, setShowReanalysisDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  const handleReanalysisConfirm = (customPrompt: string) => {
    setShowReanalysisDialog(false);
    onReanalyze?.(customPrompt);
  };

  const handleCopy = async () => {
    const textContent = document.getElementById(`step-content-${stepNumber}`)?.innerText || "";
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasImprovements = improvements && (
    (improvements.strengths && improvements.strengths.length > 0) ||
    (improvements.weaknesses && improvements.weaknesses.length > 0) ||
    (improvements.changes && improvements.changes.length > 0)
  );

  return (
    <div className={cn("bg-card border border-border rounded-lg p-6 transition-all duration-300", isActive && "ring-2 ring-primary/20", "animate-slide-up")} style={{ animationDelay: `${stepNumber * 100}ms` }}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">{stepNumber}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {currentVersion > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Sparkles className="w-3 h-3" />v{currentVersion}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {history.length >= 2 && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setShowCompareDialog(true); }} className="gap-1">
              <GitCompare className="w-4 h-4" /><span className="hidden sm:inline">비교</span>
            </Button>
          )}
          {history.length > 1 && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); }} className="gap-1">
              <History className="w-4 h-4" /><span className="hidden sm:inline">히스토리</span>
            </Button>
          )}
          {onReanalyze && (
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setShowReanalysisDialog(true); }} disabled={isLoading} className="gap-1">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>분석 중...</span></> : <><RotateCcw className="w-4 h-4" /><span>재분석</span></>}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="gap-1">
            {copied ? <><Check className="w-4 h-4 text-green-500" /><span className="text-green-500">복사됨</span></> : <><Copy className="w-4 h-4" /><span>복사</span></>}
          </Button>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border">
          {hasImprovements && (
            <Collapsible open={showImprovements} onOpenChange={setShowImprovements} className="mb-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 border border-primary/20 mb-2">
                  <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /><span className="font-medium">v{currentVersion} 개선 분석 결과</span></span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showImprovements && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  {improvements?.strengths && improvements.strengths.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1 text-green-700 dark:text-green-400"><TrendingUp className="w-4 h-4" />이전 분석 강점</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">{improvements.strengths.map((item, i) => <li key={i}>• {item}</li>)}</ul>
                    </div>
                  )}
                  {improvements?.weaknesses && improvements.weaknesses.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1 text-orange-700 dark:text-orange-400"><TrendingDown className="w-4 h-4" />이전 분석 약점</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">{improvements.weaknesses.map((item, i) => <li key={i}>• {item}</li>)}</ul>
                    </div>
                  )}
                  {improvements?.changes && improvements.changes.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1 text-blue-700 dark:text-blue-400"><Sparkles className="w-4 h-4" />이번 개선 사항</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">{improvements.changes.map((item, i) => <li key={i}>• {item}</li>)}</ul>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {showHistory && history.length > 1 && (
            <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><History className="w-4 h-4" />분석 히스토리</h4>
              <div className="space-y-2">
                {history.map((version) => (
                  <div key={version.version} className={cn(
                    "flex items-center justify-between p-2 rounded text-sm",
                    version.version === currentVersion ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
                  )}>
                    <span className="flex items-center gap-2">
                      <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", version.version === currentVersion ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20")}>{version.version}</span>
                      <span>버전 {version.version}</span>
                      {version.version === currentVersion && <span className="text-xs text-primary font-medium">(현재)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(version.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div id={`step-content-${stepNumber}`}>{content}</div>
        </div>
      )}

      <ReanalysisDialog open={showReanalysisDialog} onOpenChange={setShowReanalysisDialog} stepNumber={stepNumber} stepTitle={title} onConfirm={handleReanalysisConfirm} isLoading={isLoading} previousAnalysis={currentData} previousImprovements={improvements} />
      <VersionCompareDialog open={showCompareDialog} onOpenChange={setShowCompareDialog} stepNumber={stepNumber} stepTitle={title} history={history} />
    </div>
  );
};

export default StepCard;
