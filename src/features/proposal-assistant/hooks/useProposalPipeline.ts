import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const RESEARCH_STEPS = [
  { step: 1, key: "1_background", label: "배경분석", icon: "BookOpen" },
  { step: 2, key: "2_cases", label: "사례조사", icon: "Search" },
  { step: 3, key: "3_technology", label: "기술분석", icon: "Cpu" },
  { step: 4, key: "4_comparison", label: "비교분석", icon: "GitCompare" },
  { step: 5, key: "5_synthesis", label: "종합보고서", icon: "FileText" },
] as const;

export interface ResearchStepData {
  status: "pending" | "running" | "completed" | "error";
  data: Record<string, unknown> | null;
}

export interface DeepResearchData {
  steps: Record<string, ResearchStepData>;
  current_step: number;
  completed: boolean;
}

export interface SectionDeliverable {
  deliverable_type: string;
  title: string;
  content: Record<string, unknown>;
  status: "pending" | "generating" | "completed" | "error";
}

export interface ProposalRequirement {
  id: string;
  requirement_number: string;
  requirement_title: string;
  requirement_description: string | null;
  category: string | null;
  priority: string;
  research_data: Record<string, unknown> | null;
  research_status: "pending" | "running" | "completed" | "error";
  draft_content: Record<string, unknown> | null;
  draft_status: "pending" | "running" | "completed" | "error";
  user_notes: string | null;
  sort_order: number;
  deliverables?: SectionDeliverable[];
}

export interface ProposalProject {
  id: string;
  title: string;
  rfp_content: string;
  execution_mode: "auto" | "plan";
  current_stage: "extract" | "research" | "draft" | "merge" | "completed";
  stage_status: "pending" | "running" | "awaiting_approval" | "completed" | "error";
  merged_document: Record<string, unknown> | null;
  model: string;
  created_at: string;
}

type Stage = ProposalProject["current_stage"];
type StageStatus = ProposalProject["stage_status"];

function initDeepResearch(): DeepResearchData {
  const steps: Record<string, ResearchStepData> = {};
  for (const s of RESEARCH_STEPS) {
    steps[s.key] = { status: "pending", data: null };
  }
  return { steps, current_step: 0, completed: false };
}

function getDeepResearch(researchData: Record<string, unknown> | null): DeepResearchData | null {
  if (!researchData || !researchData.steps) return null;
  return researchData as unknown as DeepResearchData;
}

export function useProposalPipeline() {
  const [project, setProject] = useState<ProposalProject | null>(null);
  const [sections, setSections] = useState<ProposalRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);

  const updateProjectState = useCallback(async (projectId: string, stage: Stage, status: StageStatus) => {
    await supabase
      .from("proposal_projects")
      .update({ current_stage: stage, stage_status: status })
      .eq("id", projectId);
    setProject(prev => prev ? { ...prev, current_stage: stage, stage_status: status } : null);
  }, []);

  const createProject = useCallback(async (
    rfpContent: string,
    mode: "auto" | "plan",
    model: string,
    title?: string
  ): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return null;
    }

    const { data, error } = await supabase
      .from("proposal_projects")
      .insert({
        user_id: user.id,
        title: title || "새 제안서",
        rfp_content: rfpContent,
        execution_mode: mode,
        model,
      })
      .select()
      .single();

    if (error) {
      toast.error("프로젝트 생성 실패: " + error.message);
      return null;
    }

    setProject(data as unknown as ProposalProject);
    return data.id;
  }, []);

  const extractRequirements = useCallback(async (projectId: string, rfpContent: string, model: string) => {
    setStageLoading(true);
    await updateProjectState(projectId, "extract", "running");

    try {
      const { data, error } = await supabase.functions.invoke("extract-requirements", {
        body: { rfpContent, model },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const requirements = data.data?.requirements || [];
      const { data: { user } } = await supabase.auth.getUser();

      const sectionsToInsert = requirements.map((req: Record<string, string>, idx: number) => ({
        project_id: projectId,
        user_id: user!.id,
        requirement_number: req.requirement_number || `REQ-${String(idx + 1).padStart(3, "0")}`,
        requirement_title: req.title || `요구사항 ${idx + 1}`,
        requirement_description: req.description || null,
        category: req.category || null,
        priority: req.priority || "중",
        sort_order: idx,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("proposal_sections")
        .insert(sectionsToInsert)
        .select();

      if (insertError) throw new Error(insertError.message);

      setSections(inserted as unknown as ProposalRequirement[]);
      await updateProjectState(projectId, "extract", "completed");
      toast.success(`${requirements.length}개 요구사항이 추출되었습니다.`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "추출 실패";
      await updateProjectState(projectId, "extract", "error");
      toast.error("요구사항 추출 실패: " + msg);
      return false;
    } finally {
      setStageLoading(false);
    }
  }, [updateProjectState]);

  // ── 5-Step Deep Research ──

  const deepResearchStep = useCallback(async (
    section: ProposalRequirement,
    stepNum: number,
    rfpContent: string,
    model: string,
    previousResults?: unknown
  ): Promise<Record<string, unknown> | null> => {
    const stepKey = RESEARCH_STEPS[stepNum - 1].key;

    // Update local state to show running
    setSections(prev =>
      prev.map(s => {
        if (s.id !== section.id) return s;
        const deep = getDeepResearch(s.research_data) || initDeepResearch();
        deep.steps[stepKey] = { status: "running", data: null };
        deep.current_step = stepNum;
        return { ...s, research_data: deep as unknown as Record<string, unknown>, research_status: "running" as const };
      })
    );

    try {
      const { data, error } = await supabase.functions.invoke("proposal-ai", {
        body: {
          mode: "deep-research",
          researchStep: stepNum,
          requirementTitle: section.requirement_title,
          requirementDescription: section.requirement_description,
          category: section.category,
          rfpContext: rfpContent.substring(0, 5000),
          userNotes: section.user_notes,
          previousResults,
          model,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const stepData = data.data;

      // Update local state
      setSections(prev =>
        prev.map(s => {
          if (s.id !== section.id) return s;
          const deep = getDeepResearch(s.research_data) || initDeepResearch();
          deep.steps[stepKey] = { status: "completed", data: stepData };
          deep.current_step = stepNum;
          const allDone = RESEARCH_STEPS.every(rs => deep.steps[rs.key]?.status === "completed");
          deep.completed = allDone;
          return {
            ...s,
            research_data: deep as unknown as Record<string, unknown>,
            research_status: allDone ? "completed" as const : "running" as const,
          };
        })
      );

      return stepData;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "조사 실패";

      setSections(prev =>
        prev.map(s => {
          if (s.id !== section.id) return s;
          const deep = getDeepResearch(s.research_data) || initDeepResearch();
          deep.steps[stepKey] = { status: "error", data: null };
          return { ...s, research_data: deep as unknown as Record<string, unknown>, research_status: "error" as const };
        })
      );

      toast.error(`"${section.requirement_title}" Step ${stepNum} 실패: ${msg}`);
      return null;
    }
  }, []);

  const deepResearchRequirement = useCallback(async (
    section: ProposalRequirement,
    rfpContent: string,
    model: string
  ): Promise<boolean> => {
    const allStepResults: Record<string, unknown> = {};

    for (const rs of RESEARCH_STEPS) {
      const prevForStep = rs.step <= 2
        ? (allStepResults[RESEARCH_STEPS[0].key] || undefined)
        : allStepResults;

      const result = await deepResearchStep(section, rs.step, rfpContent, model, prevForStep);
      if (!result) return false;

      allStepResults[rs.key] = result;

      const currentSection = sections.find(s => s.id === section.id) || section;
      const deep = getDeepResearch(currentSection.research_data) || initDeepResearch();
      deep.steps[rs.key] = { status: "completed", data: result };
      deep.current_step = rs.step;
      deep.completed = rs.step === 5;

      await supabase
        .from("proposal_sections")
        .update({
          research_data: JSON.parse(JSON.stringify(deep)),
          research_status: rs.step === 5 ? "completed" : "running",
        })
        .eq("id", section.id);

      if (rs.step < 5) await new Promise(r => setTimeout(r, 1000));
    }

    return true;
  }, [sections, deepResearchStep]);

  // ── Multi-model Deep Research ──

  const multiModelDeepResearch = useCallback(async (
    section: ProposalRequirement,
    rfpContent: string,
    models: string[],
    synthesizeModel: string
  ): Promise<boolean> => {
    if (models.length <= 1) {
      return deepResearchRequirement(section, rfpContent, models[0] || synthesizeModel);
    }

    // Run each step across all models, then synthesize
    for (const rs of RESEARCH_STEPS) {
      // 1. Run this step on all models in parallel-ish (sequential to respect rate limits)
      const modelResults: { model: string; data: Record<string, unknown> }[] = [];

      // Show step as running
      setSections(prev =>
        prev.map(s => {
          if (s.id !== section.id) return s;
          const deep = getDeepResearch(s.research_data) || initDeepResearch();
          deep.steps[rs.key] = { status: "running", data: null };
          deep.current_step = rs.step;
          return { ...s, research_data: deep as unknown as Record<string, unknown>, research_status: "running" as const };
        })
      );

      for (const model of models) {
        try {
          // Get previous results for context
          const currentSection = sections.find(s => s.id === section.id) || section;
          const existingDeep = getDeepResearch(currentSection.research_data) || initDeepResearch();
          const allPrev: Record<string, unknown> = {};
          for (const prevStep of RESEARCH_STEPS) {
            if (prevStep.step >= rs.step) break;
            if (existingDeep.steps[prevStep.key]?.data) {
              allPrev[prevStep.key] = existingDeep.steps[prevStep.key].data;
            }
          }
          const prevForStep = rs.step <= 2 ? (allPrev[RESEARCH_STEPS[0].key] || undefined) : (Object.keys(allPrev).length > 0 ? allPrev : undefined);

          const { data, error } = await supabase.functions.invoke("proposal-ai", {
            body: {
              mode: "deep-research",
              researchStep: rs.step,
              requirementTitle: section.requirement_title,
              requirementDescription: section.requirement_description,
              category: section.category,
              rfpContext: rfpContent.substring(0, 5000),
              userNotes: section.user_notes,
              previousResults: prevForStep,
              model,
            },
          });

          if (!error && data?.data) {
            modelResults.push({ model, data: data.data });
          }
        } catch {
          // Skip failed models
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      if (modelResults.length === 0) {
        toast.error(`"${section.requirement_title}" Step ${rs.step}: 모든 모델이 실패했습니다.`);
        setSections(prev =>
          prev.map(s => {
            if (s.id !== section.id) return s;
            const deep = getDeepResearch(s.research_data) || initDeepResearch();
            deep.steps[rs.key] = { status: "error", data: null };
            return { ...s, research_data: deep as unknown as Record<string, unknown>, research_status: "error" as const };
          })
        );
        return false;
      }

      // 2. Synthesize results if multiple models succeeded
      let finalData: Record<string, unknown>;
      if (modelResults.length === 1) {
        finalData = modelResults[0].data;
      } else {
        try {
          const { data: synthResult, error: synthError } = await supabase.functions.invoke("proposal-ai", {
            body: {
              mode: "synthesize",
              stepKey: rs.key,
              stepTitle: rs.label,
              modelResults,
              model: synthesizeModel,
            },
          });
          if (synthError || !synthResult?.data) throw new Error("종합 실패");
          finalData = synthResult.data;
          // Attach source model info
          finalData._synthesized_from = modelResults.map(r => r.model);
        } catch {
          // Fallback: use first model's results
          finalData = modelResults[0].data;
          toast.warning(`Step ${rs.step} 종합 실패, 첫 번째 모델 결과를 사용합니다.`);
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      // 3. Save to state & DB
      setSections(prev =>
        prev.map(s => {
          if (s.id !== section.id) return s;
          const deep = getDeepResearch(s.research_data) || initDeepResearch();
          deep.steps[rs.key] = { status: "completed", data: finalData };
          deep.current_step = rs.step;
          const allDone = RESEARCH_STEPS.every(r2 => deep.steps[r2.key]?.status === "completed");
          deep.completed = allDone;
          return {
            ...s,
            research_data: deep as unknown as Record<string, unknown>,
            research_status: allDone ? "completed" as const : "running" as const,
          };
        })
      );

      const currentSection2 = sections.find(s => s.id === section.id) || section;
      const deep2 = getDeepResearch(currentSection2.research_data) || initDeepResearch();
      deep2.steps[rs.key] = { status: "completed", data: finalData };
      deep2.current_step = rs.step;
      deep2.completed = rs.step === 5;

      await supabase
        .from("proposal_sections")
        .update({
          research_data: JSON.parse(JSON.stringify(deep2)),
          research_status: rs.step === 5 ? "completed" : "running",
        })
        .eq("id", section.id);

      if (rs.step < 5) await new Promise(r => setTimeout(r, 1000));
    }

    toast.success(`"${section.requirement_title}" 멀티모델 딥리서치 완료`);
    return true;
  }, [sections, deepResearchStep, deepResearchRequirement]);

  const researchAll = useCallback(async (rfpContent: string, model: string) => {
    setStageLoading(true);
    if (project) await updateProjectState(project.id, "research", "running");

    let allSuccess = true;
    for (const section of sections) {
      if (section.research_status === "completed") continue;
      const ok = await deepResearchRequirement(section, rfpContent, model);
      if (!ok) allSuccess = false;
      await new Promise(r => setTimeout(r, 500));
    }

    if (project) {
      await updateProjectState(project.id, "research", allSuccess ? "completed" : "error");
    }
    if (allSuccess) toast.success("전체 딥리서치가 완료되었습니다.");
    setStageLoading(false);
    return allSuccess;
  }, [project, sections, deepResearchRequirement, updateProjectState]);

  // Legacy single-shot research (backward compat)
  const researchRequirement = useCallback(async (
    section: ProposalRequirement,
    rfpContent: string,
    model: string
  ) => {
    return deepResearchRequirement(section, rfpContent, model);
  }, [deepResearchRequirement]);

  const draftSection = useCallback(async (section: ProposalRequirement, model: string) => {
    setSections(prev =>
      prev.map(s => s.id === section.id ? { ...s, draft_status: "running" as const } : s)
    );

    try {
      const { data, error } = await supabase.functions.invoke("proposal-ai", {
        body: {
          mode: "section",
          requirementTitle: section.requirement_title,
          requirementDescription: section.requirement_description,
          category: section.category,
          researchData: section.research_data,
          userNotes: section.user_notes,
          model,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      await supabase
        .from("proposal_sections")
        .update({ draft_content: data.data, draft_status: "completed" })
        .eq("id", section.id);

      setSections(prev =>
        prev.map(s =>
          s.id === section.id
            ? { ...s, draft_content: data.data, draft_status: "completed" as const }
            : s
        )
      );
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "초안 작성 실패";
      await supabase
        .from("proposal_sections")
        .update({ draft_status: "error" })
        .eq("id", section.id);

      setSections(prev =>
        prev.map(s => s.id === section.id ? { ...s, draft_status: "error" as const } : s)
      );
      toast.error(`"${section.requirement_title}" 초안 실패: ${msg}`);
      return false;
    }
  }, []);

  const draftAll = useCallback(async (model: string) => {
    setStageLoading(true);
    if (project) await updateProjectState(project.id, "draft", "running");

    let allSuccess = true;
    for (const section of sections) {
      if (section.draft_status === "completed") continue;
      const ok = await draftSection(section, model);
      if (!ok) allSuccess = false;
      await new Promise(r => setTimeout(r, 500));
    }

    if (project) {
      await updateProjectState(project.id, "draft", allSuccess ? "completed" : "error");
    }
    if (allSuccess) toast.success("전체 초안 작성이 완료되었습니다.");
    setStageLoading(false);
    return allSuccess;
  }, [project, sections, draftSection, updateProjectState]);

  const mergeProposal = useCallback(async (model: string) => {
    if (!project) return false;
    setStageLoading(true);
    await updateProjectState(project.id, "merge", "running");

    try {
      const allSections = sections
        .filter(s => s.draft_content)
        .map(s => ({
          requirement_number: s.requirement_number,
          title: s.requirement_title,
          category: s.category,
          draft: s.draft_content,
        }));

      const { data, error } = await supabase.functions.invoke("proposal-ai", {
        body: { mode: "merge", model, allSections },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      await supabase
        .from("proposal_projects")
        .update({ merged_document: data.data, current_stage: "completed", stage_status: "completed" })
        .eq("id", project.id);

      setProject(prev =>
        prev ? { ...prev, merged_document: data.data, current_stage: "completed" as const, stage_status: "completed" as const } : null
      );
      toast.success("통합 제안서가 생성되었습니다.");
      setStageLoading(false);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "병합 실패";
      await updateProjectState(project.id, "merge", "error");
      toast.error("통합 제안서 생성 실패: " + msg);
      setStageLoading(false);
      return false;
    }
  }, [project, sections, updateProjectState]);

  const runAutoMode = useCallback(async (projectId: string, rfpContent: string, model: string) => {
    setLoading(true);
    const extracted = await extractRequirements(projectId, rfpContent, model);
    if (!extracted) { setLoading(false); return; }

    const researched = await researchAll(rfpContent, model);
    if (!researched) { setLoading(false); return; }

    const drafted = await draftAll(model);
    if (!drafted) { setLoading(false); return; }

    await mergeProposal(model);
    setLoading(false);
  }, [extractRequirements, researchAll, draftAll, mergeProposal]);

  const updateSectionNotes = useCallback(async (sectionId: string, notes: string) => {
    await supabase
      .from("proposal_sections")
      .update({ user_notes: notes })
      .eq("id", sectionId);

    setSections(prev =>
      prev.map(s => s.id === sectionId ? { ...s, user_notes: notes } : s)
    );
  }, []);

  // ── Deliverable Generation (using deep research as context) ──

  const DELIVERABLE_TYPES = [
    { id: "definition", label: "요구사항 정의서" },
    { id: "proposal", label: "기술 제안서" },
    { id: "wbs", label: "WBS/일정표" },
    { id: "estimate", label: "견적서/비용 산정" },
  ];

  const generateDeliverable = useCallback(async (
    section: ProposalRequirement,
    deliverableType: string,
    model: string
  ): Promise<boolean> => {
    // Update local state to show generating
    setSections(prev =>
      prev.map(s => {
        if (s.id !== section.id) return s;
        const existing = s.deliverables || [];
        const updated = [
          ...existing.filter(d => d.deliverable_type !== deliverableType),
          { deliverable_type: deliverableType, title: "", content: {}, status: "generating" as const },
        ];
        return { ...s, deliverables: updated };
      })
    );

    try {
      // Build additional context from deep research results
      const deep = getDeepResearch(section.research_data);
      let additionalContext = "";
      if (deep?.completed) {
        const parts: string[] = [];
        for (const rs of RESEARCH_STEPS) {
          const stepData = deep.steps[rs.key];
          if (stepData?.status === "completed" && stepData.data) {
            parts.push(`[${rs.label}]\n${JSON.stringify(stepData.data, null, 1)}`);
          }
        }
        additionalContext = parts.join("\n\n");
      }

      const { data, error } = await supabase.functions.invoke("generate-deliverable", {
        body: {
          requirement: {
            requirement_number: section.requirement_number,
            title: section.requirement_title,
            description: section.requirement_description,
            category: section.category,
            priority: section.priority,
          },
          deliverableType,
          model,
          additionalContext: additionalContext.substring(0, 10000),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const label = DELIVERABLE_TYPES.find(t => t.id === deliverableType)?.label || deliverableType;
      const deliverable: SectionDeliverable = {
        deliverable_type: deliverableType,
        title: `${section.requirement_number} - ${label}`,
        content: data.data,
        status: "completed",
      };

      setSections(prev =>
        prev.map(s => {
          if (s.id !== section.id) return s;
          const existing = s.deliverables || [];
          return {
            ...s,
            deliverables: [
              ...existing.filter(d => d.deliverable_type !== deliverableType),
              deliverable,
            ],
          };
        })
      );

      toast.success(`${label} 생성 완료`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "산출물 생성 실패";
      setSections(prev =>
        prev.map(s => {
          if (s.id !== section.id) return s;
          const existing = s.deliverables || [];
          return {
            ...s,
            deliverables: existing.map(d =>
              d.deliverable_type === deliverableType ? { ...d, status: "error" as const } : d
            ),
          };
        })
      );
      toast.error(`산출물 생성 실패: ${msg}`);
      return false;
    }
  }, []);

  const generateAllDeliverables = useCallback(async (
    section: ProposalRequirement,
    model: string
  ): Promise<boolean> => {
    let allOk = true;
    for (const dt of DELIVERABLE_TYPES) {
      const ok = await generateDeliverable(section, dt.id, model);
      if (!ok) allOk = false;
      await new Promise(r => setTimeout(r, 1000));
    }
    return allOk;
  }, [generateDeliverable]);

  const loadProject = useCallback(async (projectId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: proj, error: projErr } = await supabase
        .from("proposal_projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (projErr || !proj) {
        toast.error("프로젝트를 불러올 수 없습니다.");
        return false;
      }
      setProject(proj as unknown as ProposalProject);

      const { data: secs } = await supabase
        .from("proposal_sections")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      setSections((secs as unknown as ProposalRequirement[]) || []);
      return true;
    } catch {
      toast.error("프로젝트 로딩 중 오류가 발생했습니다.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    project,
    sections,
    loading,
    stageLoading,
    createProject,
    loadProject,
    extractRequirements,
    researchRequirement,
    deepResearchRequirement,
    multiModelDeepResearch,
    deepResearchStep,
    researchAll,
    draftSection,
    draftAll,
    mergeProposal,
    runAutoMode,
    updateSectionNotes,
    generateDeliverable,
    generateAllDeliverables,
    setSections,
    setProject,
    RESEARCH_STEPS,
    DELIVERABLE_TYPES,
  };
}
