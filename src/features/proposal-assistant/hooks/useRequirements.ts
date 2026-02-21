import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface Requirement {
  id?: string;
  requirement_number: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  source?: string;
  deliverables?: string[];
}

export interface Deliverable {
  id?: string;
  requirement_id: string;
  deliverable_type: string;
  title: string;
  content: Record<string, unknown>;
  status: string;
}

const DELIVERABLE_TYPES = [
  { id: "definition", label: "요구사항 정의서", icon: "FileText" },
  { id: "proposal", label: "기술 제안서", icon: "Lightbulb" },
  { id: "wbs", label: "WBS/일정표", icon: "Calendar" },
  { id: "estimate", label: "견적서/비용 산정", icon: "Calculator" },
];

export function useRequirements() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [deliverables, setDeliverables] = useState<Record<string, Deliverable[]>>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("google/gemini-3-flash-preview");

  const extractRequirements = async (rfpContent: string) => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-requirements", {
        body: { rfpContent, model: selectedModel }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const extracted = data.data.requirements || [];
      setRequirements(extracted);
      toast.success(`${extracted.length}개의 요구사항이 추출되었습니다.`);
      return extracted;
    } catch (error) {
      console.error("Extract error:", error);
      toast.error(error instanceof Error ? error.message : "요구사항 추출 중 오류가 발생했습니다.");
      return [];
    } finally {
      setIsExtracting(false);
    }
  };

  const addRequirement = (requirement: Requirement) => {
    setRequirements(prev => [...prev, requirement]);
  };

  const updateRequirement = (index: number, requirement: Requirement) => {
    setRequirements(prev => prev.map((r, i) => i === index ? requirement : r));
  };

  const removeRequirement = (index: number) => {
    setRequirements(prev => prev.filter((_, i) => i !== index));
  };

  const generateDeliverable = async (
    requirement: Requirement,
    deliverableType: string,
    additionalContext?: string
  ) => {
    const key = `${requirement.requirement_number}-${deliverableType}`;
    setIsGenerating(key);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-deliverable", {
        body: { 
          requirement, 
          deliverableType, 
          model: selectedModel,
          additionalContext 
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const deliverable: Deliverable = {
        requirement_id: requirement.id || requirement.requirement_number,
        deliverable_type: deliverableType,
        title: `${requirement.requirement_number} - ${DELIVERABLE_TYPES.find(t => t.id === deliverableType)?.label}`,
        content: data.data,
        status: "draft"
      };

      setDeliverables(prev => ({
        ...prev,
        [requirement.requirement_number]: [
          ...(prev[requirement.requirement_number] || []).filter(d => d.deliverable_type !== deliverableType),
          deliverable
        ]
      }));

      toast.success("산출물이 생성되었습니다.");
      return deliverable;
    } catch (error) {
      console.error("Generate error:", error);
      toast.error(error instanceof Error ? error.message : "산출물 생성 중 오류가 발생했습니다.");
      return null;
    } finally {
      setIsGenerating(null);
    }
  };

  const saveRequirementsToDb = async (userId: string, analysisId?: string) => {
    try {
      for (const req of requirements) {
        const { data: reqData, error: reqError } = await supabase
          .from("requirements")
          .insert({
            user_id: userId,
            analysis_id: analysisId || null,
            requirement_number: req.requirement_number,
            title: req.title,
            description: req.description,
            category: req.category,
            priority: req.priority,
            source: req.source
          })
          .select()
          .single();

        if (reqError) throw reqError;

        const reqDeliverables = deliverables[req.requirement_number] || [];
        for (const del of reqDeliverables) {
          await supabase
            .from("deliverables")
            .insert({
              user_id: userId,
              requirement_id: reqData.id,
              deliverable_type: del.deliverable_type,
              title: del.title,
              content: del.content as Json,
              status: del.status
            });
        }
      }
      toast.success("저장되었습니다.");
      return true;
    } catch (error) {
      console.error("Save error:", error);
      toast.error("저장 중 오류가 발생했습니다.");
      return false;
    }
  };

  const loadRequirementsFromDb = async (userId: string, analysisId?: string) => {
    try {
      let query = supabase
        .from("requirements")
        .select("*")
        .eq("user_id", userId);

      if (analysisId) {
        query = query.eq("analysis_id", analysisId);
      }

      const { data: reqs, error: reqError } = await query.order("created_at", { ascending: true });
      if (reqError) throw reqError;

      if (reqs) {
        setRequirements(reqs.map(r => ({
          id: r.id,
          requirement_number: r.requirement_number,
          title: r.title,
          description: r.description || undefined,
          category: r.category || undefined,
          priority: r.priority || undefined,
          source: r.source || undefined
        })));

        for (const req of reqs) {
          const { data: dels } = await supabase
            .from("deliverables")
            .select("*")
            .eq("requirement_id", req.id);

          if (dels && dels.length > 0) {
            setDeliverables(prev => ({
              ...prev,
              [req.requirement_number]: dels.map(d => ({
                id: d.id,
                requirement_id: d.requirement_id,
                deliverable_type: d.deliverable_type,
                title: d.title,
                content: d.content as Record<string, unknown>,
                status: d.status || "draft"
              }))
            }));
          }
        }
      }
    } catch (error) {
      console.error("Load error:", error);
      toast.error("데이터 로드 중 오류가 발생했습니다.");
    }
  };

  const resetAll = () => {
    setRequirements([]);
    setDeliverables({});
  };

  return {
    requirements,
    deliverables,
    isExtracting,
    isGenerating,
    selectedModel,
    setSelectedModel,
    extractRequirements,
    addRequirement,
    updateRequirement,
    removeRequirement,
    generateDeliverable,
    saveRequirementsToDb,
    loadRequirementsFromDb,
    resetAll,
    DELIVERABLE_TYPES
  };
}
