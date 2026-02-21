import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const researchRequirement = useCallback(async (
    section: ProposalRequirement,
    rfpContent: string,
    model: string
  ) => {
    setSections(prev =>
      prev.map(s => s.id === section.id ? { ...s, research_status: "running" as const } : s)
    );

    try {
      const { data, error } = await supabase.functions.invoke("proposal-ai", {
        body: {
          mode: "research",
          requirementTitle: section.requirement_title,
          requirementDescription: section.requirement_description,
          category: section.category,
          rfpContext: rfpContent.substring(0, 5000),
          userNotes: section.user_notes,
          model,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      await supabase
        .from("proposal_sections")
        .update({ research_data: data.data, research_status: "completed" })
        .eq("id", section.id);

      setSections(prev =>
        prev.map(s =>
          s.id === section.id
            ? { ...s, research_data: data.data, research_status: "completed" as const }
            : s
        )
      );
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "조사 실패";
      await supabase
        .from("proposal_sections")
        .update({ research_status: "error" })
        .eq("id", section.id);

      setSections(prev =>
        prev.map(s => s.id === section.id ? { ...s, research_status: "error" as const } : s)
      );
      toast.error(`"${section.requirement_title}" 조사 실패: ${msg}`);
      return false;
    }
  }, []);

  const researchAll = useCallback(async (rfpContent: string, model: string) => {
    setStageLoading(true);
    if (project) await updateProjectState(project.id, "research", "running");

    let allSuccess = true;
    for (const section of sections) {
      if (section.research_status === "completed") continue;
      const ok = await researchRequirement(section, rfpContent, model);
      if (!ok) allSuccess = false;
      await new Promise(r => setTimeout(r, 500));
    }

    if (project) {
      await updateProjectState(project.id, "research", allSuccess ? "completed" : "error");
    }
    if (allSuccess) toast.success("전체 자료조사가 완료되었습니다.");
    setStageLoading(false);
    return allSuccess;
  }, [project, sections, researchRequirement, updateProjectState]);

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

  return {
    project,
    sections,
    loading,
    stageLoading,
    createProject,
    extractRequirements,
    researchRequirement,
    researchAll,
    draftSection,
    draftAll,
    mergeProposal,
    runAutoMode,
    updateSectionNotes,
    setSections,
    setProject,
  };
}
