import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import RfpInput from "../components/RfpInput";
import AnalysisResults from "../components/AnalysisResults";
import AuthModal from "../components/AuthModal";
import SaveAnalysisDialog from "../components/SaveAnalysisDialog";
import SavedAnalysesList from "../components/SavedAnalysesList";
import { AnalysisProvider, useAnalysisContext, StepAnalysisData } from "../contexts/AnalysisContext";
import { useAuth } from "../hooks/useAuth";
import { useSavedAnalyses, SavedAnalysis } from "../hooks/useSavedAnalyses";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Save, FolderOpen, LogIn, LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const AnalysisPageInner = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  
  const { user, signUp, signIn, signOut } = useAuth();
  const {
    rfpContent, setRfpContent, analysisResults, isAnalyzing, currentAnalyzingStep,
    selectedModel, setSelectedModel, analyzeStep, analyzeAllSteps, resetAnalysis,
    setAnalysisResults, showResults, setShowResults
  } = useAnalysisContext();

  const { savedAnalyses, loading: loadingSaved, saveAnalysis, deleteAnalysis } = useSavedAnalyses(user?.id);

  // Load analysis from history page navigation state
  useEffect(() => {
    const state = location.state as { loadAnalysis?: SavedAnalysis } | null;
    if (state?.loadAnalysis) {
      handleLoadAnalysis(state.loadAnalysis);
      // Clear the state so it doesn't reload on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSubmit = async (content: string) => {
    setRfpContent(content);
    setShowResults(true);
    resetAnalysis();
    await analyzeAllSteps(content);
  };

  const handleReanalyzeStep = async (step: number, customPrompt?: string) => {
    if (!rfpContent) return;
    await analyzeStep(rfpContent, step, true, customPrompt);
  };

  const handleSave = async (title: string): Promise<boolean> => {
    return await saveAnalysis(title, rfpContent, analysisResults);
  };

  const handleLoadAnalysis = (analysis: SavedAnalysis) => {
    setRfpContent(analysis.rfp_content);
    setShowResults(true);
    const loadedResults: Record<number, StepAnalysisData> = {};
    for (let i = 1; i <= 6; i++) {
      const stepData = analysis[`step${i}_data` as keyof SavedAnalysis] as Record<string, unknown> | null;
      if (stepData) {
        loadedResults[i] = { step: i, data: stepData, loading: false, error: null, history: [], currentVersion: 1 };
      }
    }
    setAnalysisResults(loadedResults);
    toast.success(`"${analysis.title}" 분석 결과를 불러왔습니다.`);
  };

  const completedSteps = Object.values(analysisResults).filter(
    r => !r.loading && !r.error && Object.keys(r.data).length > 0
  ).length;
  const currentStep = currentAnalyzingStep || completedSteps;
  const hasResults = completedSteps > 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">RFP / 요구사항 분석</h1>
          <p className="text-sm text-muted-foreground mt-1">ISP·ISMP 공통가이드 제9판 기반 6단계 AI 분석</p>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2"><FolderOpen className="w-4 h-4" />저장된 분석</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader><SheetTitle>저장된 분석 결과</SheetTitle></SheetHeader>
                  <div className="mt-4">
                    <SavedAnalysesList analyses={savedAnalyses} loading={loadingSaved} onLoad={handleLoadAnalysis} onDelete={deleteAnalysis} />
                  </div>
                </SheetContent>
              </Sheet>
              {hasResults && (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setSaveDialogOpen(true)}>
                  <Save className="w-4 h-4" />저장
                </Button>
              )}
              <Button variant="ghost" size="sm" className="gap-2" onClick={signOut}>
                <User className="w-4 h-4" /><span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAuthModalOpen(true)}>
              <LogIn className="w-4 h-4" />로그인
            </Button>
          )}
        </div>
      </div>

      <RfpInput onSubmit={handleSubmit} isProcessing={isAnalyzing} selectedModel={selectedModel} onModelChange={setSelectedModel} />

      {showResults && (
        <div className="mt-8">
          <AnalysisResults ref={resultsRef} rfpContent={rfpContent} currentStep={currentStep} analysisResults={analysisResults} isAnalyzing={isAnalyzing} currentAnalyzingStep={currentAnalyzingStep} onReanalyzeStep={handleReanalyzeStep} />
        </div>
      )}

      {!showResults && (
        <div className="text-center py-12 mt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">RFP를 입력하면 AI가 자동으로 분석합니다</h3>
          <p className="text-muted-foreground max-w-md mx-auto">제안요청서 내용을 위 입력창에 붙여넣거나 파일을 업로드하고 "AI 분석 시작" 버튼을 클릭하세요.</p>
        </div>
      )}

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} onSignUp={signUp} onSignIn={signIn} />
      <SaveAnalysisDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} onSave={handleSave} />
    </div>
  );
};

export default function AnalysisPage() {
  return (
    <AnalysisProvider>
      <AnalysisPageInner />
    </AnalysisProvider>
  );
}
