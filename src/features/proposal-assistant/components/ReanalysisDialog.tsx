import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RotateCcw, Sparkles, Save, Bookmark, ChevronDown, ChevronUp, Trash2, FileText, TrendingUp, TrendingDown, AlertCircle
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePromptTemplates, PromptTemplate } from "../hooks/usePromptTemplates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReanalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepNumber: number;
  stepTitle: string;
  onConfirm: (customPrompt: string) => void;
  isLoading?: boolean;
  previousAnalysis?: Record<string, unknown>;
  previousImprovements?: { strengths?: string[]; weaknesses?: string[] };
}

const promptSuggestions = [
  "더 구체적인 정량적 수치와 KPI를 포함해주세요",
  "실제 공공기관 사례를 더 많이 반영해주세요",
  "클라우드 네이티브 관점을 더 강화해주세요",
  "리스크 대응 방안을 더 상세하게 작성해주세요",
  "ISP·ISMP 가이드라인 항목별로 더 명확하게 구분해주세요",
];

const generateAnalysisSummary = (data: Record<string, unknown>, stepNumber: number): string[] => {
  const summaries: string[] = [];
  switch (stepNumber) {
    case 1:
      if (Array.isArray(data.surfacePurpose)) summaries.push(`표면적 목적 ${data.surfacePurpose.length}개 도출`);
      if (Array.isArray(data.realProblems)) summaries.push(`실제 해결과제 ${data.realProblems.length}개 식별`);
      if (Array.isArray(data.policyLinks)) summaries.push(`정책 연계 ${data.policyLinks.length}건`);
      break;
    case 2:
      if (Array.isArray(data.canDo)) summaries.push(`현재 역량 ${data.canDo.length}개`);
      if (Array.isArray(data.cannotDo)) summaries.push(`제약사항 ${data.cannotDo.length}개`);
      break;
    case 3:
      if (Array.isArray(data.scenarios)) summaries.push(`${data.scenarios.length}개 시나리오 비교`);
      break;
    case 4:
      if (data.businessValidity) summaries.push("사업 타당성 분석 완료");
      if (data.feasibility) summaries.push("실현 가능성 분석 완료");
      break;
    case 5:
      if (data.architecture) summaries.push("To-Be 아키텍처 설계 완료");
      if (Array.isArray(data.roadmap)) summaries.push(`${data.roadmap.length}단계 로드맵 수립`);
      break;
    case 6:
      if (Array.isArray(data.aiDataRisks)) summaries.push(`AI/데이터 리스크 ${data.aiDataRisks.length}건`);
      if (data.expansionStrategy) summaries.push("확산 전략 수립 완료");
      break;
  }
  return summaries.length > 0 ? summaries : ["분석 데이터 있음"];
};

export const ReanalysisDialog = ({
  open, onOpenChange, stepNumber, stepTitle, onConfirm, isLoading = false, previousAnalysis, previousImprovements,
}: ReanalysisDialogProps) => {
  const [customPrompt, setCustomPrompt] = useState("");
  const [showPreviousAnalysis, setShowPreviousAnalysis] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const { templates, addTemplate, deleteTemplate } = usePromptTemplates();

  useEffect(() => {
    if (open) { setCustomPrompt(""); setShowSaveTemplate(false); setNewTemplateName(""); }
  }, [open]);

  const handleConfirm = () => { onConfirm(customPrompt); setCustomPrompt(""); };
  const handleSuggestionClick = (s: string) => setCustomPrompt(prev => prev ? `${prev}\n${s}` : s);

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) { toast.error("템플릿 이름을 입력해주세요."); return; }
    if (!customPrompt.trim()) { toast.error("저장할 프롬프트를 입력해주세요."); return; }
    addTemplate(newTemplateName.trim(), customPrompt.trim());
    toast.success("템플릿이 저장되었습니다.");
    setShowSaveTemplate(false); setNewTemplateName("");
  };

  const handleLoadTemplate = (t: PromptTemplate) => { setCustomPrompt(t.prompt); setShowTemplates(false); toast.success(`"${t.name}" 템플릿을 불러왔습니다.`); };
  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => { e.stopPropagation(); deleteTemplate(id); toast.success("템플릿이 삭제되었습니다."); };

  const analysisSummary = previousAnalysis ? generateAnalysisSummary(previousAnalysis, stepNumber) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" />STEP {stepNumber} 재분석</DialogTitle>
          <DialogDescription>"{stepTitle}" 단계를 재분석합니다.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {previousAnalysis && Object.keys(previousAnalysis).length > 0 && (
              <Collapsible open={showPreviousAnalysis} onOpenChange={setShowPreviousAnalysis}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between bg-muted/50 hover:bg-muted border border-border">
                    <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /><span className="font-medium">이전 분석 결과 요약</span></span>
                    {showPreviousAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />분석 현황</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisSummary.map((item, i) => (
                          <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{item}</span>
                        ))}
                      </div>
                    </div>
                    {previousImprovements && (
                      <div className="grid md:grid-cols-2 gap-3">
                        {previousImprovements.strengths && previousImprovements.strengths.length > 0 && (
                          <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <h5 className="font-medium text-xs mb-1.5 flex items-center gap-1 text-green-700 dark:text-green-400"><TrendingUp className="w-3.5 h-3.5" />이전 분석 강점</h5>
                            <ul className="text-xs space-y-0.5 text-muted-foreground">
                              {previousImprovements.strengths.slice(0, 3).map((item, i) => <li key={i} className="truncate">• {item}</li>)}
                            </ul>
                          </div>
                        )}
                        {previousImprovements.weaknesses && previousImprovements.weaknesses.length > 0 && (
                          <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                            <h5 className="font-medium text-xs mb-1.5 flex items-center gap-1 text-orange-700 dark:text-orange-400"><TrendingDown className="w-3.5 h-3.5" />개선 필요 사항</h5>
                            <ul className="text-xs space-y-0.5 text-muted-foreground">
                              {previousImprovements.weaknesses.slice(0, 3).map((item, i) => <li key={i} className="truncate">• {item}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {templates.length > 0 && (
              <Collapsible open={showTemplates} onOpenChange={setShowTemplates}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between bg-muted/50 hover:bg-muted border border-border">
                    <span className="flex items-center gap-2"><Bookmark className="w-4 h-4 text-amber-500" /><span className="font-medium">저장된 템플릿 ({templates.length})</span></span>
                    {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-2">
                    {templates.map((template) => (
                      <div key={template.id} onClick={() => handleLoadTemplate(template)} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{template.prompt}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={(e) => handleDeleteTemplate(template.id, e)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom-prompt">재분석 방향 (선택사항)</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSaveTemplate(!showSaveTemplate)} disabled={!customPrompt.trim()}>
                  <Save className="w-3 h-3" />템플릿 저장
                </Button>
              </div>
              {showSaveTemplate && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                  <Input placeholder="템플릿 이름" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="h-8 text-sm" />
                  <Button size="sm" className="h-8" onClick={handleSaveTemplate}>저장</Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowSaveTemplate(false); setNewTemplateName(""); }}>취소</Button>
                </div>
              )}
              <Textarea id="custom-prompt" placeholder="예: 클라우드 도입 관점에서 더 상세하게 분석해주세요." value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} className="min-h-[100px] resize-none" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" />빠른 선택</Label>
              <div className="flex flex-wrap gap-2">
                {promptSuggestions.map((suggestion, index) => (
                  <Button key={index} type="button" variant="outline" size="sm" className="text-xs h-auto py-1.5 px-2.5" onClick={() => handleSuggestionClick(suggestion)}>
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>취소</Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? <><span className="animate-spin mr-2">⏳</span>분석 중...</> : <><RotateCcw className="w-4 h-4 mr-2" />재분석 시작</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
