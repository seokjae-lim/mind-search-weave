import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus, GitCompare } from "lucide-react";
import { AnalysisVersion } from "../contexts/AnalysisContext";
import { cn } from "@/lib/utils";

interface VersionCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepNumber: number;
  stepTitle: string;
  history: AnalysisVersion[];
}

export const VersionCompareDialog = ({ open, onOpenChange, stepNumber, stepTitle, history }: VersionCompareDialogProps) => {
  const [leftVersion, setLeftVersion] = useState<string>("");
  const [rightVersion, setRightVersion] = useState<string>("");

  useMemo(() => {
    if (open && history.length >= 2) {
      setLeftVersion(history[history.length - 2]?.version.toString() || "");
      setRightVersion(history[history.length - 1]?.version.toString() || "");
    }
  }, [open, history]);

  const leftData = history.find(h => h.version.toString() === leftVersion)?.data || {};
  const rightData = history.find(h => h.version.toString() === rightVersion)?.data || {};
  const rightImprovements = history.find(h => h.version.toString() === rightVersion);

  const allKeys = [...new Set([...Object.keys(leftData), ...Object.keys(rightData)])];

  const formatValue = (value: unknown): string => {
    if (Array.isArray(value)) {
      if (value.length === 0) return "(없음)";
      if (typeof value[0] === "string") return value.join("\n• ");
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
    return value?.toString() || "(없음)";
  };

  const getItemCount = (value: unknown): number => {
    if (Array.isArray(value)) return value.length;
    if (typeof value === "object" && value !== null) return Object.keys(value).length;
    return value ? 1 : 0;
  };

  const getDiff = (key: string): "added" | "removed" | "changed" | "same" => {
    const leftVal = leftData[key];
    const rightVal = rightData[key];
    if (!leftVal && rightVal) return "added";
    if (leftVal && !rightVal) return "removed";
    if (JSON.stringify(leftVal) !== JSON.stringify(rightVal)) return "changed";
    return "same";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />STEP {stepNumber} 버전 비교
            <span className="text-muted-foreground font-normal ml-2">{stepTitle}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">비교 기준 (이전)</label>
            <Select value={leftVersion} onValueChange={setLeftVersion}>
              <SelectTrigger><SelectValue placeholder="버전 선택" /></SelectTrigger>
              <SelectContent>
                {history.map((h) => (
                  <SelectItem key={h.version} value={h.version.toString()}>버전 {h.version} ({new Date(h.timestamp).toLocaleDateString('ko-KR')})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ArrowLeftRight className="w-6 h-6 text-muted-foreground mt-6" />
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">비교 대상 (이후)</label>
            <Select value={rightVersion} onValueChange={setRightVersion}>
              <SelectTrigger><SelectValue placeholder="버전 선택" /></SelectTrigger>
              <SelectContent>
                {history.map((h) => (
                  <SelectItem key={h.version} value={h.version.toString()}>버전 {h.version} ({new Date(h.timestamp).toLocaleDateString('ko-KR')})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(rightImprovements?.strengths || rightImprovements?.weaknesses) && (
          <div className="grid md:grid-cols-2 gap-3 p-4 bg-gradient-to-r from-green-50/50 to-orange-50/50 dark:from-green-950/20 dark:to-orange-950/20 rounded-lg border">
            {rightImprovements?.strengths && rightImprovements.strengths.length > 0 && (
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">강점 ({rightImprovements.strengths.length})</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {rightImprovements.strengths.slice(0, 2).map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {rightImprovements?.weaknesses && rightImprovements.weaknesses.length > 0 && (
              <div className="flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-400">개선 필요 ({rightImprovements.weaknesses.length})</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {rightImprovements.weaknesses.slice(0, 2).map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 p-1">
            {allKeys.map((key) => {
              const diff = getDiff(key);
              const leftVal = leftData[key];
              const rightVal = rightData[key];
              const leftCount = getItemCount(leftVal);
              const rightCount = getItemCount(rightVal);
              const countDiff = rightCount - leftCount;

              return (
                <div key={key} className={cn(
                  "rounded-lg border overflow-hidden",
                  diff === "added" && "border-green-300 dark:border-green-700",
                  diff === "removed" && "border-red-300 dark:border-red-700",
                  diff === "changed" && "border-blue-300 dark:border-blue-700",
                  diff === "same" && "border-border"
                )}>
                  <div className={cn(
                    "flex items-center justify-between px-4 py-2",
                    diff === "added" && "bg-green-50 dark:bg-green-950/30",
                    diff === "removed" && "bg-red-50 dark:bg-red-950/30",
                    diff === "changed" && "bg-blue-50 dark:bg-blue-950/30",
                    diff === "same" && "bg-muted/50"
                  )}>
                    <span className="font-medium text-sm">{key}</span>
                    <div className="flex items-center gap-2">
                      {diff === "added" && <Badge variant="secondary" className="bg-green-100 text-green-700">추가됨</Badge>}
                      {diff === "removed" && <Badge variant="secondary" className="bg-red-100 text-red-700">삭제됨</Badge>}
                      {diff === "changed" && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 flex items-center gap-1">
                          변경됨{countDiff !== 0 && <span className={cn("ml-1", countDiff > 0 ? "text-green-600" : "text-red-600")}>({countDiff > 0 ? `+${countDiff}` : countDiff})</span>}
                        </Badge>
                      )}
                      {diff === "same" && <Badge variant="outline">동일</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-4 bg-red-50/30 dark:bg-red-950/10 min-h-[100px]">
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Minus className="w-3 h-3" />버전 {leftVersion}</div>
                      <pre className="text-xs whitespace-pre-wrap break-words font-mono text-foreground/80">
                        {leftVal ? (Array.isArray(leftVal) && typeof leftVal[0] === "string" ? `• ${formatValue(leftVal)}` : formatValue(leftVal)) : "(없음)"}
                      </pre>
                    </div>
                    <div className="p-4 bg-green-50/30 dark:bg-green-950/10 min-h-[100px]">
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" />버전 {rightVersion}</div>
                      <pre className="text-xs whitespace-pre-wrap break-words font-mono text-foreground/80">
                        {rightVal ? (Array.isArray(rightVal) && typeof rightVal[0] === "string" ? `• ${formatValue(rightVal)}` : formatValue(rightVal)) : "(없음)"}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
