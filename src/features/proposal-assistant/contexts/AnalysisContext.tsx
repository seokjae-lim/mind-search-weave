import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AnalysisVersion {
  version: number;
  data: Record<string, unknown>;
  timestamp: Date;
  strengths?: string[];
  weaknesses?: string[];
}

export interface StepAnalysisData {
  step: number;
  data: Record<string, unknown>;
  loading: boolean;
  error: string | null;
  history: AnalysisVersion[];
  currentVersion: number;
}

export interface AnalysisContextType {
  rfpContent: string;
  setRfpContent: (content: string) => void;
  analysisResults: Record<number, StepAnalysisData>;
  isAnalyzing: boolean;
  currentAnalyzingStep: number | null;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  analyzeStep: (rfpContent: string, step: number, isReanalysis?: boolean, customPrompt?: string) => Promise<void>;
  analyzeAllSteps: (rfpContent: string) => Promise<void>;
  resetAnalysis: () => void;
  setAnalysisResults: React.Dispatch<React.SetStateAction<Record<number, StepAnalysisData>>>;
  showResults: boolean;
  setShowResults: (show: boolean) => void;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export const useAnalysisContext = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysisContext must be used within an AnalysisProvider");
  }
  return context;
};

interface AnalysisProviderProps {
  children: ReactNode;
}

export const AnalysisProvider: React.FC<AnalysisProviderProps> = ({ children }) => {
  const [rfpContent, setRfpContent] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<Record<number, StepAnalysisData>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalyzingStep, setCurrentAnalyzingStep] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState("google/gemini-3-flash-preview");

  const analyzeStep = useCallback(async (content: string, step: number, isReanalysis = false, customPrompt?: string) => {
    if (!content.trim()) {
      toast.error("RFP 내용이 없습니다.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("분석을 수행하려면 로그인이 필요합니다.");
      return;
    }

    const previousData = analysisResults[step];
    const previousAnalysis = isReanalysis && previousData?.data ? previousData.data : null;
    const previousHistory = previousData?.history || [];
    const currentVersion = previousData?.currentVersion || 0;

    setCurrentAnalyzingStep(step);
    setAnalysisResults(prev => ({
      ...prev,
      [step]: { 
        ...prev[step],
        step, 
        data: prev[step]?.data || {}, 
        loading: true, 
        error: null,
        history: previousHistory,
        currentVersion
      }
    }));

    try {
      const { data, error } = await supabase.functions.invoke("analyze-rfp", {
        body: {
          rfpContent: content,
          step,
          previousAnalysis: isReanalysis ? previousAnalysis : null,
          isReanalysis,
          model: selectedModel,
          customPrompt: customPrompt || null,
        },
      });

      if (error) {
        const status = (error as unknown as { context?: Response })?.context?.status;
        let detailedMessage = error.message || "분석 중 오류가 발생했습니다.";

        try {
          const res = (error as unknown as { context?: Response })?.context;
          if (res) {
            const text = await res.text();
            try {
              const parsed = JSON.parse(text);
              if (parsed?.error && typeof parsed.error === "string") {
                detailedMessage = parsed.error;
              }
            } catch {
              if (text?.trim()) detailedMessage = text;
            }
          }
        } catch {
          // ignore
        }

        if (status === 402) {
          throw new Error("크레딧이 부족합니다. 워크스페이스에 크레딧을 추가한 뒤 다시 시도해주세요.");
        }

        throw new Error(detailedMessage);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const newVersion = currentVersion + 1;
      const newHistoryEntry: AnalysisVersion = {
        version: newVersion,
        data: data.data,
        timestamp: new Date(),
        strengths: data.improvements?.strengths,
        weaknesses: data.improvements?.weaknesses,
      };

      const updatedHistory = previousAnalysis
        ? [
            ...previousHistory,
            {
              version: currentVersion,
              data: previousAnalysis as Record<string, unknown>,
              timestamp: previousData?.history?.[previousHistory.length - 1]?.timestamp || new Date(),
            },
          ]
        : previousHistory;

      setAnalysisResults((prev) => ({
        ...prev,
        [step]: {
          step,
          data: data.data,
          loading: false,
          error: null,
          history: [...updatedHistory, newHistoryEntry],
          currentVersion: newVersion,
        },
      }));

      if (isReanalysis) {
        toast.success(`STEP ${step} 재분석이 완료되었습니다. (버전 ${newVersion})`);
      } else {
        toast.success(`STEP ${step} 분석이 완료되었습니다.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류";
      setAnalysisResults((prev) => ({
        ...prev,
        [step]: {
          step,
          data: prev[step]?.data || {},
          loading: false,
          error: errorMessage,
          history: previousHistory,
          currentVersion,
        },
      }));
      toast.error(`STEP ${step} 분석 실패: ${errorMessage}`);
    } finally {
      setCurrentAnalyzingStep(null);
    }
  }, [analysisResults, selectedModel]);

  const analyzeAllSteps = useCallback(async (content: string) => {
    if (!content.trim()) {
      toast.error("RFP 내용이 없습니다.");
      return;
    }

    setIsAnalyzing(true);
    
    for (let step = 1; step <= 6; step++) {
      await analyzeStep(content, step, false);
      if (step < 6) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsAnalyzing(false);
    toast.success("전체 분석이 완료되었습니다!");
  }, [analyzeStep]);

  const resetAnalysis = useCallback(() => {
    setAnalysisResults({});
    setIsAnalyzing(false);
    setCurrentAnalyzingStep(null);
  }, []);

  const value: AnalysisContextType = {
    rfpContent,
    setRfpContent,
    analysisResults,
    isAnalyzing,
    currentAnalyzingStep,
    selectedModel,
    setSelectedModel,
    analyzeStep,
    analyzeAllSteps,
    resetAnalysis,
    setAnalysisResults,
    showResults,
    setShowResults
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};
