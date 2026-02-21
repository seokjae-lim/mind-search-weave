
-- ======================================
-- ISP/ISMP 제안서 도우미 기능 이식용 테이블
-- ======================================

-- 1. RFP 분석 결과 저장
CREATE TABLE public.analysis_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  rfp_content TEXT NOT NULL,
  step1_data JSONB,
  step2_data JSONB,
  step3_data JSONB,
  step4_data JSONB,
  step5_data JSONB,
  step6_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses" ON public.analysis_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON public.analysis_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON public.analysis_results
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON public.analysis_results
  FOR DELETE USING (auth.uid() = user_id);

-- 2. 제안서 프로젝트 (파이프라인)
CREATE TABLE public.proposal_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '새 제안서',
  rfp_content TEXT NOT NULL,
  execution_mode TEXT NOT NULL DEFAULT 'plan' CHECK (execution_mode IN ('auto', 'plan')),
  current_stage TEXT NOT NULL DEFAULT 'extract' CHECK (current_stage IN ('extract', 'research', 'draft', 'merge', 'completed')),
  stage_status TEXT NOT NULL DEFAULT 'pending' CHECK (stage_status IN ('pending', 'running', 'awaiting_approval', 'completed', 'error')),
  merged_document JSONB,
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.proposal_projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.proposal_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.proposal_projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.proposal_projects
  FOR DELETE USING (auth.uid() = user_id);

-- 3. 제안서 섹션 (요구사항별 조사/초안)
CREATE TABLE public.proposal_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.proposal_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  requirement_number TEXT NOT NULL,
  requirement_title TEXT NOT NULL,
  requirement_description TEXT,
  category TEXT,
  priority TEXT NOT NULL DEFAULT '중',
  research_data JSONB,
  research_status TEXT NOT NULL DEFAULT 'pending' CHECK (research_status IN ('pending', 'running', 'completed', 'error')),
  draft_content JSONB,
  draft_status TEXT NOT NULL DEFAULT 'pending' CHECK (draft_status IN ('pending', 'running', 'completed', 'error')),
  user_notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sections" ON public.proposal_sections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sections" ON public.proposal_sections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sections" ON public.proposal_sections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sections" ON public.proposal_sections
  FOR DELETE USING (auth.uid() = user_id);

-- 4. 요구사항 (산출물 관리용)
CREATE TABLE public.requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_id UUID,
  requirement_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requirements" ON public.requirements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own requirements" ON public.requirements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own requirements" ON public.requirements
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own requirements" ON public.requirements
  FOR DELETE USING (auth.uid() = user_id);

-- 5. 산출물
CREATE TABLE public.deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deliverables" ON public.deliverables
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deliverables" ON public.deliverables
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deliverables" ON public.deliverables
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deliverables" ON public.deliverables
  FOR DELETE USING (auth.uid() = user_id);

-- 6. 외부 AI 모델 API 키
CREATE TABLE public.user_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own keys" ON public.user_api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keys" ON public.user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keys" ON public.user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own keys" ON public.user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at 트리거
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_analysis_results_updated_at BEFORE UPDATE ON public.analysis_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_proposal_projects_updated_at BEFORE UPDATE ON public.proposal_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_proposal_sections_updated_at BEFORE UPDATE ON public.proposal_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
