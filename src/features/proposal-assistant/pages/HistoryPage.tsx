import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSavedAnalyses, SavedAnalysis } from "../hooks/useSavedAnalyses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "../hooks/useAuth";
import AuthModal from "../components/AuthModal";
import {
  exportAnalysisToPdf,
  exportAnalysisToExcel,
  exportProposalToPdf,
  exportProposalToExcel,
} from "../lib/exportUtils";
import {
  History,
  FileText,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  LogIn,
  Loader2,
  ClipboardList,
  BookOpen,
  Calendar,
  Eye,
  ExternalLink,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ── Proposal project types ──

interface ProposalProjectRow {
  id: string;
  title: string;
  rfp_content: string;
  model: string;
  current_stage: string;
  stage_status: string;
  execution_mode: string;
  merged_document: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ProposalSectionRow {
  id: string;
  requirement_number: string;
  requirement_title: string;
  requirement_description: string | null;
  category: string | null;
  priority: string;
  research_status: string;
  draft_status: string;
  research_data: Record<string, unknown> | null;
  draft_content: Record<string, unknown> | null;
  user_notes: string | null;
}

// ── Step label helpers ──

const STEP_LABELS: Record<number, string> = {
  1: "사업 개요 분석",
  2: "기술 요구사항 분석",
  3: "리스크 분석",
  4: "경쟁 환경 분석",
  5: "실행 전략",
  6: "종합 평가",
};

const STAGE_LABELS: Record<string, string> = {
  extract: "요구사항 추출",
  research: "자료조사",
  draft: "초안 작성",
  merge: "통합",
  completed: "완료",
};

const STAGE_COLORS: Record<string, string> = {
  pending: "secondary",
  running: "default",
  completed: "default",
  error: "destructive",
};

// ── Sub-components ──

function AnalysisDetail({ analysis }: { analysis: SavedAnalysis }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const steps = [1, 2, 3, 4, 5, 6] as const;
  const stepData = steps.map(n => ({
    num: n,
    label: STEP_LABELS[n],
    data: analysis[`step${n}_data` as keyof SavedAnalysis] as Record<string, unknown> | null,
  }));

  return (
    <div className="space-y-2 mt-3">
      {stepData.map(({ num, label, data }) => (
        <div key={num} className="border rounded-lg">
          <button
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
            onClick={() => setExpanded(expanded === num ? null : num)}
          >
            <div className="flex items-center gap-2">
              <Badge variant={data ? "default" : "secondary"} className="text-xs">
                Step {num}
              </Badge>
              <span className="text-sm font-medium">{label}</span>
            </div>
            {expanded === num ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {expanded === num && (
            <div className="px-3 pb-3">
              <Separator className="mb-3" />
              {data ? (
                <ScrollArea className="max-h-80">
                  <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">분석 데이터 없음</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProposalDetail({ project }: { project: ProposalProjectRow }) {
  const [sections, setSections] = useState<ProposalSectionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadSections = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("proposal_sections")
        .select("*")
        .eq("project_id", project.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setSections((data as unknown as ProposalSectionRow[]) || []);
      setLoaded(true);
    } catch {
      toast.error("섹션 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [project.id, loaded]);

  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
        <span>모델: <Badge variant="outline" className="text-xs">{project.model}</Badge></span>
        <span>모드: {project.execution_mode === "auto" ? "자동" : "계획"}</span>
      </div>

      <Button variant="outline" size="sm" onClick={loadSections} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
        {loaded ? "섹션 새로고침" : "요구사항 섹션 보기"}
      </Button>

      {sections.length > 0 && (
        <div className="space-y-2">
          {sections.map(sec => (
            <div key={sec.id} className="border rounded-lg">
              <button
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(expanded === sec.id ? null : sec.id)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{sec.requirement_number}</Badge>
                  <span className="text-sm font-medium">{sec.requirement_title}</span>
                  <Badge variant={STAGE_COLORS[sec.research_status] as "default" | "secondary" | "destructive"} className="text-xs">
                    조사: {sec.research_status}
                  </Badge>
                  <Badge variant={STAGE_COLORS[sec.draft_status] as "default" | "secondary" | "destructive"} className="text-xs">
                    초안: {sec.draft_status}
                  </Badge>
                </div>
                {expanded === sec.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {expanded === sec.id && (
                <div className="px-3 pb-3 space-y-3">
                  <Separator />
                  {sec.requirement_description && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">설명</p>
                      <p className="text-sm">{sec.requirement_description}</p>
                    </div>
                  )}
                  {sec.research_data && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">자료조사 결과</p>
                      <ScrollArea className="max-h-60">
                        <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 p-2 rounded">
                          {JSON.stringify(sec.research_data, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                  {sec.draft_content && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">제안서 초안</p>
                      <ScrollArea className="max-h-60">
                        <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 p-2 rounded">
                          {JSON.stringify(sec.draft_content, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {project.merged_document && (
        <div className="border rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">통합 제안서</p>
          <ScrollArea className="max-h-80">
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 p-2 rounded">
              {JSON.stringify(project.merged_document, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// ── Main page ──

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();
  const { savedAnalyses, loading: analysesLoading, deleteAnalysis } = useSavedAnalyses(user?.id);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Proposal projects
  const [projects, setProjects] = useState<ProposalProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setProjectsLoading(true);
    try {
      const { data, error } = await supabase
        .from("proposal_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProjects((data as unknown as ProposalProjectRow[]) || []);
    } catch {
      toast.error("제안서 프로젝트 로드 실패");
    } finally {
      setProjectsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchProjects();
  }, [user, fetchProjects]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      // Delete sections first
      await supabase.from("proposal_sections").delete().eq("project_id", id);
      const { error } = await supabase.from("proposal_projects").delete().eq("id", id);
      if (error) throw error;
      toast.success("제안서 프로젝트가 삭제되었습니다.");
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch {
      toast.error("삭제 실패");
    }
  }, []);

  // ── Not logged in ──
  if (!user) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <History className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">히스토리</h2>
        <p className="text-muted-foreground text-center">
          저장된 분석 결과와 제안서를 보려면 로그인이 필요합니다.
        </p>
        <Button onClick={() => setAuthModalOpen(true)}>
          <LogIn className="h-4 w-4 mr-2" />
          로그인 / 회원가입
        </Button>
        <AuthModal
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
          onSignUp={signUp}
          onSignIn={signIn}
        />
      </div>
    );
  }

  const filteredAnalyses = savedAnalyses.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = analysesLoading || projectsLoading;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">히스토리</h1>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="제목으로 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="analyses">
        <TabsList>
          <TabsTrigger value="analyses" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            RFP 분석 ({filteredAnalyses.length})
          </TabsTrigger>
          <TabsTrigger value="proposals" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            제안서 프로젝트 ({filteredProjects.length})
          </TabsTrigger>
        </TabsList>

        {/* ── RFP 분석 탭 ── */}
        <TabsContent value="analyses" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAnalyses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">저장된 RFP 분석 결과가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAnalyses.map(analysis => (
                <Card key={analysis.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="flex-1 text-left"
                        onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}
                      >
                        <CardTitle className="text-base flex items-center gap-2">
                          {expandedId === analysis.id ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                          {analysis.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1 ml-6">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(analysis.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {[1,2,3,4,5,6].filter(n => analysis[`step${n}_data` as keyof SavedAnalysis]).length}/6 단계
                          </Badge>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/assistant/research", { state: { loadAnalysis: analysis } });
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          불러오기
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportAnalysisToPdf(analysis)}>
                              <FileText className="h-4 w-4 mr-2" /> PDF 내보내기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportAnalysisToExcel(analysis)}>
                              <FileText className="h-4 w-4 mr-2" /> Excel 내보내기
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>분석 결과 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{analysis.title}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAnalysis(analysis.id)}>
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  {expandedId === analysis.id && (
                    <CardContent>
                      <AnalysisDetail analysis={analysis} />
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── 제안서 프로젝트 탭 ── */}
        <TabsContent value="proposals" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">저장된 제안서 프로젝트가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map(project => (
                <Card key={project.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="flex-1 text-left"
                        onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                      >
                        <CardTitle className="text-base flex items-center gap-2">
                          {expandedId === project.id ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                          {project.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1 ml-6 flex-wrap">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(project.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                          </span>
                          <Badge variant={STAGE_COLORS[project.stage_status] as "default" | "secondary" | "destructive"} className="text-xs">
                            {STAGE_LABELS[project.current_stage] || project.current_stage}
                          </Badge>
                          {project.merged_document && (
                            <Badge variant="default" className="text-xs">통합문서 있음</Badge>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={async () => {
                              const { data: secs } = await supabase.from("proposal_sections").select("*").eq("project_id", project.id).order("sort_order", { ascending: true });
                              exportProposalToPdf(project, (secs as any) || []);
                            }}>
                              <FileText className="h-4 w-4 mr-2" /> PDF 내보내기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              const { data: secs } = await supabase.from("proposal_sections").select("*").eq("project_id", project.id).order("sort_order", { ascending: true });
                              exportProposalToExcel(project, (secs as any) || []);
                            }}>
                              <FileText className="h-4 w-4 mr-2" /> Excel 내보내기
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>프로젝트 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{project.title}" 프로젝트와 모든 섹션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteProject(project.id)}>
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  {expandedId === project.id && (
                    <CardContent>
                      <ProposalDetail project={project} />
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
