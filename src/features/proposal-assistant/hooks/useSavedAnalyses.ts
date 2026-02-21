import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StepAnalysisData } from "../contexts/AnalysisContext";

export interface SavedAnalysis {
  id: string;
  title: string;
  rfp_content: string;
  step1_data: Record<string, unknown> | null;
  step2_data: Record<string, unknown> | null;
  step3_data: Record<string, unknown> | null;
  step4_data: Record<string, unknown> | null;
  step5_data: Record<string, unknown> | null;
  step6_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const useSavedAnalyses = (userId: string | undefined) => {
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("analysis_results")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedAnalyses((data as unknown as SavedAnalysis[]) || []);
    } catch (err) {
      console.error("Error fetching analyses:", err);
      toast.error("저장된 분석 결과를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchAnalyses();
    }
  }, [userId, fetchAnalyses]);

  const saveAnalysis = useCallback(async (
    title: string,
    rfpContent: string,
    results: Record<number, StepAnalysisData>
  ): Promise<boolean> => {
    if (!userId) {
      toast.error("로그인이 필요합니다.");
      return false;
    }

    try {
      const insertData = {
        user_id: userId,
        title,
        rfp_content: rfpContent,
        step1_data: results[1]?.data || null,
        step2_data: results[2]?.data || null,
        step3_data: results[3]?.data || null,
        step4_data: results[4]?.data || null,
        step5_data: results[5]?.data || null,
        step6_data: results[6]?.data || null
      };
      
      const { error } = await supabase
        .from("analysis_results")
        .insert(insertData as any);
      if (error) throw error;

      toast.success("분석 결과가 저장되었습니다.");
      await fetchAnalyses();
      return true;
    } catch (err) {
      console.error("Error saving analysis:", err);
      toast.error("분석 결과 저장 중 오류가 발생했습니다.");
      return false;
    }
  }, [userId, fetchAnalyses]);

  const deleteAnalysis = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) {
      toast.error("로그인이 필요합니다.");
      return false;
    }

    try {
      const { error } = await supabase
        .from("analysis_results")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("분석 결과가 삭제되었습니다.");
      await fetchAnalyses();
      return true;
    } catch (err) {
      console.error("Error deleting analysis:", err);
      toast.error("분석 결과 삭제 중 오류가 발생했습니다.");
      return false;
    }
  }, [userId, fetchAnalyses]);

  return { savedAnalyses, loading, fetchAnalyses, saveAnalysis, deleteAnalysis };
};
