import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ModelSelector, { availableModels } from "../components/ModelSelector";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../hooks/useAuth";
import {
  useProposalPipeline,
  ProposalRequirement,
  RESEARCH_STEPS,
  type DeepResearchData,
  type ResearchStepData,
  type SectionDeliverable,
} from "../hooks/useProposalPipeline";
import { useAnalysisContext, AnalysisProvider } from "../contexts/AnalysisContext";
import {
  Play,
  ListChecks,
  Search,
  FileEdit,
  Merge,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Zap,
  ClipboardCheck,
  BookOpen,
  Cpu,
  GitCompare,
  FileText,
  Lightbulb,
  Calendar,
  Calculator,
  Package,
  Copy,
  Check,
  Download,
  Import,
  Layers,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { exportProposalToPdf, exportProposalToExcel } from "../lib/exportUtils";

const STAGES = [
  { key: "extract", label: "요구사항 추출", icon: ListChecks, step: 1 },
  { key: "research", label: "딥리서치", icon: Search, step: 2 },
  { key: "draft", label: "초안 작성", icon: FileEdit, step: 3 },
  { key: "merge", label: "통합 문서", icon: Merge, step: 4 },
] as const;

const stageOrder: Record<string, number> = { extract: 0, research: 1, draft: 2, merge: 3, completed: 4 };

const STEP_ICONS: Record<string, React.ElementType> = {
  "1_background": BookOpen,
  "2_cases": Search,
  "3_technology": Cpu,
  "4_comparison": GitCompare,
  "5_synthesis": FileText,
};

function getDeepResearch(data: Record<string, unknown> | null): DeepResearchData | null {
  if (!data || !data.steps) return null;
  return data as unknown as DeepResearchData;
}

const WorkflowPageInner = () => {
  const [rfpInput, setRfpInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("google/gemini-3-flash-preview");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [multiModelEnabled, setMultiModelEnabled] = useState(false);
  const [executionMode, setExecutionMode] = useState<"auto" | "plan">("plan");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<Array<{ id: string; title: string; rfp_content: string; created_at: string }>>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const location = useLocation();

  const { user, signUp, signIn } = useAuth();
  const { rfpContent } = useAnalysisContext();

  const {
    project,
    sections,
    loading,
    stageLoading,
    createProject,
    loadProject,
    extractRequirements,
    deepResearchRequirement,
    multiModelDeepResearch,
    researchAll,
    draftSection,
    draftAll,
    mergeProposal,
    runAutoMode,
    updateSectionNotes,
    generateDeliverable,
    generateAllDeliverables,
    DELIVERABLE_TYPES,
  } = useProposalPipeline();

  // Load project from history navigation
  useEffect(() => {
    const state = location.state as { loadProjectId?: string } | null;
    if (state?.loadProjectId && !project) {
      loadProject(state.loadProjectId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, project, loadProject]);

  // Load saved analyses for import
  const loadSavedAnalyses = useCallback(async () => {
    if (!user) return;
    setLoadingAnalyses(true);
    try {
      const { data, error } = await supabase
        .from("analysis_results")
        .select("id, title, rfp_content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setSavedAnalyses(data || []);
    } catch {
      toast.error("분석 결과 목록 불러오기 실패");
    } finally {
      setLoadingAnalyses(false);
    }
  }, [user]);

  const handleImportAnalysis = (rfpContent: string) => {
    setRfpInput(rfpContent);
    setShowImportDialog(false);
    toast.success("RFP 분석 내용이 불러와졌습니다.");
  };

  const toggleMultiModel = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(m => m !== modelId)
        : [...prev, modelId]
    );
  };

  const handleStart = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const content = rfpInput.trim() || rfpContent;
    if (!content || content.length < 10) {
      toast.error("RFP 내용을 입력해주세요 (최소 10자).");
      return;
    }

    const projectId = await createProject(content, executionMode, selectedModel);
    if (!projectId) return;

    if (executionMode === "auto") {
      await runAutoMode(projectId, content, selectedModel);
    } else {
      await extractRequirements(projectId, content, selectedModel);
    }
  };

  const handleApproveStage = async () => {
    if (!project) return;
    const rfp = project.rfp_content;

    if (project.current_stage === "extract" && project.stage_status === "completed") {
      await researchAll(rfp, project.model);
    } else if (project.current_stage === "research" && project.stage_status === "completed") {
      await draftAll(project.model);
    } else if (project.current_stage === "draft" && project.stage_status === "completed") {
      await mergeProposal(project.model);
    }
  };

  const currentStageIdx = project ? stageOrder[project.current_stage] ?? 0 : -1;
  const progressValue = project
    ? project.current_stage === "completed"
      ? 100
      : ((currentStageIdx + (project.stage_status === "completed" ? 1 : 0.5)) / 4) * 100
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-primary"><CheckCircle2 className="w-3 h-3 mr-1" />완료</Badge>;
      case "running":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />진행중</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />오류</Badge>;
      default:
        return <Badge variant="outline">대기</Badge>;
    }
  };

  const handleSaveNotes = async (sectionId: string) => {
    await updateSectionNotes(sectionId, notesValue);
    setEditingNotes(null);
    toast.success("메모가 저장되었습니다.");
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">통합 제안서 워크플로우</h1>
        <p className="text-muted-foreground">
          RFP 요구사항 추출 → 5단계 딥리서치 → 제안서 초안 → 통합 문서까지 한 곳에서 관리합니다.
        </p>
      </div>

      {/* Setup Section */}
      {!project && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">1. RFP 입력 및 실행 모드 설정</CardTitle>
                <CardDescription>분석된 RFP가 있으면 자동으로 불러옵니다.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (!user) { setAuthModalOpen(true); return; }
                  loadSavedAnalyses();
                  setShowImportDialog(true);
                }}
              >
                <Import className="w-4 h-4" />
                분석 불러오기
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={rfpInput || rfpContent}
              onChange={(e) => setRfpInput(e.target.value)}
              placeholder="제안요청서(RFP) 내용을 붙여넣으세요..."
              className="min-h-[200px]"
            />

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[250px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">기본 모델 (초안/통합용)</label>
                <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={executionMode === "auto" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExecutionMode("auto")}
                  className="gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  자동 실행
                </Button>
                <Button
                  variant={executionMode === "plan" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExecutionMode("plan")}
                  className="gap-1.5"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  단계별 승인
                </Button>
              </div>
            </div>

            {/* Multi-model research toggle */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">멀티모델 딥리서치</span>
                </div>
                <Button
                  variant={multiModelEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMultiModelEnabled(!multiModelEnabled)}
                  className="gap-1.5"
                >
                  {multiModelEnabled ? <Check className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                  {multiModelEnabled ? "활성화됨" : "비활성화"}
                </Button>
              </div>
              {multiModelEnabled && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    여러 모델로 동시에 조사한 후 결과를 취합하여 최적의 연구 결과를 생성합니다.
                    조사할 모델을 선택하세요 (2개 이상):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableModels.filter(m => m.isLovable).map(m => (
                      <Button
                        key={m.id}
                        variant={selectedModels.includes(m.id) ? "default" : "outline"}
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => toggleMultiModel(m.id)}
                      >
                        {selectedModels.includes(m.id) && <CheckSquare className="w-3 h-3" />}
                        {m.name}
                      </Button>
                    ))}
                  </div>
                  {selectedModels.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ✅ {selectedModels.length}개 모델 선택됨 · 종합 모델: {availableModels.find(m => m.id === selectedModel)?.name || selectedModel}
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {executionMode === "auto"
                ? "🚀 자동 실행: 추출 → 5단계 딥리서치 → 초안 → 통합까지 모두 자동으로 실행됩니다."
                : "📋 단계별 승인: 각 단계 완료 후 결과를 확인하고 승인 버튼을 눌러 다음 단계를 진행합니다."}
            </p>

            <Button onClick={handleStart} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? "처리 중..." : "워크플로우 시작"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Progress */}
      {project && (
        <>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  워크플로우 진행 상황
                </span>
                <span className="text-sm font-medium text-primary">{Math.round(progressValue)}%</span>
              </div>
              <Progress value={progressValue} className="h-2 mb-4" />

              <div className="flex items-center justify-between">
                {STAGES.map((stage, idx) => {
                  const isCompleted = currentStageIdx > idx || project.current_stage === "completed";
                  const isCurrent = currentStageIdx === idx;
                  const Icon = stage.icon;

                  return (
                    <div key={stage.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            isCompleted && "bg-primary text-primary-foreground",
                            isCurrent && !isCompleted && "bg-accent text-accent-foreground",
                            !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isCurrent && project.stage_status === "running" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        <span className={cn(
                          "mt-2 text-xs font-medium text-center",
                          isCompleted && "text-primary font-semibold",
                          isCurrent && "text-accent-foreground font-semibold",
                          !isCompleted && !isCurrent && "text-muted-foreground"
                        )}>
                          {stage.label}
                        </span>
                      </div>
                      {idx < STAGES.length - 1 && (
                        <div className="flex-1 mx-2 h-0.5 relative">
                          <div className="absolute inset-0 bg-muted rounded-full" />
                          <div
                            className={cn(
                              "absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500",
                              currentStageIdx > idx + 1 || project.current_stage === "completed"
                                ? "w-full"
                                : currentStageIdx === idx + 1
                                ? "w-1/2"
                                : currentStageIdx > idx
                                ? "w-full"
                                : "w-0"
                            )}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Approve button for plan mode */}
              {project.execution_mode === "plan" &&
                project.stage_status === "completed" &&
                project.current_stage !== "completed" && (
                  <div className="mt-4 flex justify-center">
                    <Button onClick={handleApproveStage} disabled={stageLoading} className="gap-2">
                      {stageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      다음 단계 승인 및 실행
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Sections / Results */}
          <Tabs defaultValue="sections" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <TabsList>
                <TabsTrigger value="sections">요구사항 ({sections.length})</TabsTrigger>
                <TabsTrigger value="deliverables" disabled={sections.length === 0}>
                  <Package className="w-3.5 h-3.5 mr-1" />
                  산출물
                </TabsTrigger>
                {project.merged_document && <TabsTrigger value="merged">통합 제안서</TabsTrigger>}
              </TabsList>

              {sections.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => exportProposalToPdf(project, sections)}
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => exportProposalToExcel(project, sections)}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Excel
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="sections">
              <div className="space-y-3">
                {sections.length === 0 && !stageLoading && (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      요구사항이 아직 추출되지 않았습니다.
                    </CardContent>
                  </Card>
                )}

                {sections.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    expanded={expandedSection === section.id}
                    onToggle={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    onResearch={() => {
                      if (multiModelEnabled && selectedModels.length >= 2) {
                        multiModelDeepResearch(section, project!.rfp_content, selectedModels, project!.model);
                      } else {
                        deepResearchRequirement(section, project!.rfp_content, project!.model);
                      }
                    }}
                    onDraft={() => draftSection(section, project!.model)}
                    editingNotes={editingNotes === section.id}
                    notesValue={notesValue}
                    onStartEditNotes={() => { setEditingNotes(section.id); setNotesValue(section.user_notes || ""); }}
                    onNotesChange={setNotesValue}
                    onSaveNotes={() => handleSaveNotes(section.id)}
                    onCancelNotes={() => setEditingNotes(null)}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="deliverables">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      산출물 생성
                    </CardTitle>
                    <CardDescription>
                      딥리서치 결과를 기반으로 요구사항별 산출물을 생성합니다. 조사가 완료된 요구사항만 생성 가능합니다.
                    </CardDescription>
                  </CardHeader>
                </Card>

                {sections.map((section) => (
                  <DeliverableSection
                    key={section.id}
                    section={section}
                    model={project!.model}
                    onGenerate={(type) => generateDeliverable(section, type, project!.model)}
                    onGenerateAll={() => generateAllDeliverables(section, project!.model)}
                    deliverableTypes={DELIVERABLE_TYPES}
                  />
                ))}
              </div>
            </TabsContent>

            {project.merged_document && (
              <TabsContent value="merged">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {(project.merged_document as Record<string, unknown>).title as string || "통합 제안서"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <MergedDocumentView document={project.merged_document} />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}

      {/* Import Analysis Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImportDialog(false)}>
          <Card className="w-full max-w-lg mx-4 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Import className="w-5 h-5 text-primary" />
                  RFP 분석 결과 불러오기
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowImportDialog(false)}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>저장된 RFP 분석의 원문을 워크플로우에 불러옵니다.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {loadingAnalyses ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : savedAnalyses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">저장된 분석 결과가 없습니다.</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-3">
                    {savedAnalyses.map(a => (
                      <div
                        key={a.id}
                        className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleImportAnalysis(a.rfp_content)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{a.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {new Date(a.created_at).toLocaleDateString("ko-KR")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {a.rfp_content.substring(0, 150)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSignUp={signUp}
        onSignIn={signIn}
      />
    </div>
  );
};

/* ---------- Sub-components ---------- */

interface SectionCardProps {
  section: ProposalRequirement;
  expanded: boolean;
  onToggle: () => void;
  onResearch: () => void;
  onDraft: () => void;
  editingNotes: boolean;
  notesValue: string;
  onStartEditNotes: () => void;
  onNotesChange: (v: string) => void;
  onSaveNotes: () => void;
  onCancelNotes: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

const SectionCard = ({
  section, expanded, onToggle, onResearch, onDraft,
  editingNotes, notesValue, onStartEditNotes, onNotesChange, onSaveNotes, onCancelNotes,
  getStatusBadge,
}: SectionCardProps) => {
  const deep = getDeepResearch(section.research_data);

  return (
    <Card>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="outline" className="shrink-0">{section.requirement_number}</Badge>
          <span className="font-medium truncate">{section.requirement_title}</span>
          {section.category && (
            <Badge variant="secondary" className="hidden sm:inline-flex">{section.category}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge(section.research_status)}
          {getStatusBadge(section.draft_status)}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <CardContent className="border-t space-y-4">
          {section.requirement_description && (
            <p className="text-sm text-muted-foreground">{section.requirement_description}</p>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onResearch(); }}
              disabled={section.research_status === "running"}
              className="gap-1.5"
            >
              {section.research_status === "running" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Search className="w-3 h-3" />
              )}
              {section.research_status === "completed" ? "재조사 (5단계)" : "딥리서치 시작"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onDraft(); }}
              disabled={section.draft_status === "running" || section.research_status !== "completed"}
              className="gap-1.5"
            >
              {section.draft_status === "running" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FileEdit className="w-3 h-3" />
              )}
              {section.draft_status === "completed" ? "재작성" : "초안 작성"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onStartEditNotes(); }}
              className="gap-1.5"
            >
              <StickyNote className="w-3 h-3" />
              참고사항
            </Button>
          </div>

          {editingNotes && (
            <div className="space-y-2">
              <Textarea
                value={notesValue}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="이 요구사항에 대한 참고사항이나 추가 자료를 입력하세요..."
                className="min-h-[80px]"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); onSaveNotes(); }}>저장</Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onCancelNotes(); }}>취소</Button>
              </div>
            </div>
          )}

          {/* 5-Step Deep Research Progress */}
          {deep && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Search className="w-4 h-4 text-primary" />
                딥리서치 진행 현황
              </h4>
              <div className="space-y-2">
                {RESEARCH_STEPS.map((rs) => {
                  const stepData = deep.steps[rs.key] as ResearchStepData | undefined;
                  const status = stepData?.status || "pending";
                  const Icon = STEP_ICONS[rs.key] || Search;

                  return (
                    <DeepResearchStepView
                      key={rs.key}
                      stepNum={rs.step}
                      label={rs.label}
                      icon={Icon}
                      status={status}
                      data={stepData?.data || null}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Legacy research data (non-deep) */}
          {section.research_data && !deep && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Search className="w-4 h-4 text-primary" />
                자료조사 결과
              </h4>
              <LegacyResearchView data={section.research_data} />
            </div>
          )}

          {section.draft_content && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <FileEdit className="w-4 h-4 text-primary" />
                제안서 초안
              </h4>
              <DraftContentView data={section.draft_content} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

/* Deep Research Step View */
const DeepResearchStepView = ({
  stepNum, label, icon: Icon, status, data,
}: {
  stepNum: number;
  label: string;
  icon: React.ElementType;
  status: string;
  data: Record<string, unknown> | null;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg">
      <button
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => data && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs",
            status === "completed" && "bg-primary text-primary-foreground",
            status === "running" && "bg-accent text-accent-foreground",
            status === "error" && "bg-destructive text-destructive-foreground",
            status === "pending" && "bg-muted text-muted-foreground",
          )}>
            {status === "running" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : status === "completed" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : status === "error" ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              stepNum
            )}
          </div>
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {data && (
          expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
      {expanded && data && (
        <div className="px-3 pb-3 border-t">
          <ScrollArea className="max-h-60 mt-2">
            <ResearchStepContent stepNum={stepNum} data={data} />
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

/* Render each step's structured data */
const ResearchStepContent = ({ stepNum, data }: { stepNum: number; data: Record<string, unknown> }) => (
  <div className="text-sm space-y-2">
    {Object.entries(data).map(([key, value]) => {
      if (key === "step_title") return null;
      const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      if (typeof value === "string") {
        return (
          <div key={key}>
            <strong className="text-xs text-muted-foreground">{label}:</strong>
            <p className="mt-0.5 whitespace-pre-wrap">{value}</p>
          </div>
        );
      }
      if (Array.isArray(value)) {
        return (
          <div key={key}>
            <strong className="text-xs text-muted-foreground">{label}:</strong>
            <ul className="mt-0.5 list-disc list-inside space-y-0.5">
              {value.map((item, i) => (
                <li key={i} className="text-sm">
                  {typeof item === "string" ? item : JSON.stringify(item, null, 1)}
                </li>
              ))}
            </ul>
          </div>
        );
      }
      if (typeof value === "object" && value !== null) {
        return (
          <div key={key}>
            <strong className="text-xs text-muted-foreground">{label}:</strong>
            <pre className="mt-0.5 text-xs bg-muted/50 p-2 rounded whitespace-pre-wrap">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        );
      }
      return null;
    })}
  </div>
);

const LegacyResearchView = ({ data }: { data: Record<string, unknown> }) => (
  <div className="text-sm space-y-2">
    {data.summary && <p>{data.summary as string}</p>}
    {data.background && (
      <div>
        <strong className="text-xs text-muted-foreground">배경 분석:</strong>
        <p className="mt-1">{data.background as string}</p>
      </div>
    )}
    {Array.isArray(data.best_practices) && data.best_practices.length > 0 && (
      <div>
        <strong className="text-xs text-muted-foreground">모범 사례:</strong>
        <ul className="mt-1 list-disc list-inside space-y-0.5">
          {(data.best_practices as string[]).map((bp, i) => <li key={i}>{bp}</li>)}
        </ul>
      </div>
    )}
  </div>
);

const DraftContentView = ({ data }: { data: Record<string, unknown> }) => (
  <div className="text-sm space-y-3">
    {data.section_title && <h5 className="font-semibold">{data.section_title as string}</h5>}
    {data.understanding && (
      <div>
        <strong className="text-xs text-muted-foreground">요구사항 이해:</strong>
        <p className="mt-1 whitespace-pre-wrap">{data.understanding as string}</p>
      </div>
    )}
    {data.approach && (
      <div>
        <strong className="text-xs text-muted-foreground">접근 방안:</strong>
        <p className="mt-1 whitespace-pre-wrap">{data.approach as string}</p>
      </div>
    )}
    {data.implementation_plan && (
      <div>
        <strong className="text-xs text-muted-foreground">구현 계획:</strong>
        <p className="mt-1 whitespace-pre-wrap">{data.implementation_plan as string}</p>
      </div>
    )}
    {data.expected_outcomes && (
      <div>
        <strong className="text-xs text-muted-foreground">기대 효과:</strong>
        <p className="mt-1 whitespace-pre-wrap">{data.expected_outcomes as string}</p>
      </div>
    )}
  </div>
);

const MergedDocumentView = ({ document }: { document: Record<string, unknown> }) => (
  <div className="prose prose-sm max-w-none dark:prose-invert">
    {document.title && <h2>{document.title as string}</h2>}
    {document.executive_summary && (
      <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg mb-6">
        <h3 className="text-base font-semibold mt-0">경영진 요약</h3>
        <p>{document.executive_summary as string}</p>
      </div>
    )}
    {Array.isArray(document.sections) &&
      (document.sections as Array<Record<string, string>>).map((sec, i) => (
        <div key={i} className="mb-6">
          <h3>{sec.section_number}. {sec.title}</h3>
          <div className="whitespace-pre-wrap">{sec.content}</div>
        </div>
      ))}
    {document.conclusion && (
      <div className="mt-8 border-t pt-4">
        <h3>결론 및 기대효과</h3>
        <p className="whitespace-pre-wrap">{document.conclusion as string}</p>
      </div>
    )}
  </div>
);

/* ---------- Deliverable Section ---------- */

const DELIVERABLE_ICONS: Record<string, React.ElementType> = {
  definition: FileText,
  proposal: Lightbulb,
  wbs: Calendar,
  estimate: Calculator,
};

interface DeliverableSectionProps {
  section: ProposalRequirement;
  model: string;
  onGenerate: (type: string) => void;
  onGenerateAll: () => void;
  deliverableTypes: { id: string; label: string }[];
}

const DeliverableSection = ({ section, onGenerate, onGenerateAll, deliverableTypes }: DeliverableSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const researchDone = section.research_status === "completed";
  const deliverables = section.deliverables || [];

  const copyContent = async (content: Record<string, unknown>, type: string) => {
    await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <Card className={cn(!researchDone && "opacity-60")}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="outline" className="shrink-0">{section.requirement_number}</Badge>
          <span className="font-medium truncate">{section.requirement_title}</span>
          {deliverables.filter(d => d.status === "completed").length > 0 && (
            <Badge variant="secondary" className="shrink-0">
              {deliverables.filter(d => d.status === "completed").length}/{deliverableTypes.length} 생성됨
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!researchDone && <Badge variant="outline" className="text-xs">조사 미완료</Badge>}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <CardContent className="border-t space-y-4">
          {!researchDone && (
            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              ⚠️ 딥리서치를 먼저 완료해야 산출물을 생성할 수 있습니다. &quot;요구사항&quot; 탭에서 딥리서치를 실행하세요.
            </p>
          )}

          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onGenerateAll(); }}
              disabled={!researchDone || deliverables.some(d => d.status === "generating")}
              className="gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              전체 생성
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {deliverableTypes.map((dt) => {
              const Icon = DELIVERABLE_ICONS[dt.id] || FileText;
              const existing = deliverables.find(d => d.deliverable_type === dt.id);
              const isGenerating = existing?.status === "generating";
              const isCompleted = existing?.status === "completed";

              return (
                <div key={dt.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{dt.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isCompleted && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyContent(existing!.content, dt.id);
                          }}
                        >
                          {copiedType === dt.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={isCompleted ? "secondary" : "outline"}
                        onClick={(e) => { e.stopPropagation(); onGenerate(dt.id); }}
                        disabled={!researchDone || isGenerating}
                        className="gap-1 h-7 text-xs"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        {isCompleted ? "재생성" : "생성"}
                      </Button>
                    </div>
                  </div>

                  {isCompleted && existing?.content && (
                    <DeliverableContentPreview content={existing.content} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const DeliverableContentPreview = ({ content }: { content: Record<string, unknown> }) => {
  const [showFull, setShowFull] = useState(false);

  // Show first few keys as preview
  const entries = Object.entries(content).filter(([k]) => k !== "requirement_id");
  const preview = entries.slice(0, 3);

  return (
    <div className="border-t px-3 pb-3">
      <div className="mt-2 text-sm space-y-1.5">
        {(showFull ? entries : preview).map(([key, value]) => (
          <div key={key}>
            <span className="text-xs font-medium text-muted-foreground">
              {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}:
            </span>
            <span className="ml-1.5 text-sm">
              {typeof value === "string"
                ? (showFull ? value : value.substring(0, 100) + (value.length > 100 ? "..." : ""))
                : Array.isArray(value)
                ? `[${value.length}개 항목]`
                : typeof value === "object" && value !== null
                ? `{${Object.keys(value as object).length}개 필드}`
                : String(value)}
            </span>
          </div>
        ))}
      </div>
      {entries.length > 3 && (
        <button
          className="text-xs text-primary mt-2 hover:underline"
          onClick={(e) => { e.stopPropagation(); setShowFull(!showFull); }}
        >
          {showFull ? "접기" : `+${entries.length - 3}개 더 보기`}
        </button>
      )}
    </div>
  );
};

export default function WorkflowPage() {
  return (
    <AnalysisProvider>
      <WorkflowPageInner />
    </AnalysisProvider>
  );
}
