import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const lovableModels = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-3-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5.2",
];

const externalPrefixes = ["huggingface/", "deepseek/", "anthropic/", "moonshot/", "openrouter/"];

// ── 5-Step Deep Research Prompts ──

const RESEARCH_STEP_PROMPTS: Record<number, { title: string; systemPrompt: string; buildUser: (body: Record<string, unknown>, prevResults?: unknown) => string }> = {
  1: {
    title: "배경분석",
    systemPrompt: `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
주어진 요구사항에 대해 배경 및 필요성을 심층 분석합니다.

다음 JSON 형식으로 응답하세요:
{
  "step_title": "배경분석",
  "overview": "요구사항 전체 맥락 요약 (3-5문장)",
  "business_background": "사업적 배경 및 추진 경위",
  "necessity": "도입 필요성 분석 (현재 문제점, AS-IS/TO-BE)",
  "policy_context": "관련 정책·법제도·가이드라인",
  "stakeholders": ["이해관계자 목록과 역할"],
  "scope_definition": "사업 범위 정의"
}

중요: 대한민국 공공부문 환경에 맞게 분석하고, "~를 수행한다" 형태의 공문서 체를 사용할 것.`,
    buildUser: (body) => {
      const { requirementTitle, requirementDescription, category, rfpContext, userNotes } = body;
      return `다음 요구사항에 대해 배경분석을 수행하세요:

**요구사항 제목**: ${requirementTitle}
**요구사항 설명**: ${requirementDescription || "없음"}
**분류**: ${category || "미분류"}
${rfpContext ? `\n**RFP 원문 컨텍스트** (참고용):\n${(rfpContext as string).substring(0, 5000)}` : ""}
${userNotes ? `\n**사용자 참고사항**:\n${userNotes}` : ""}`;
    },
  },
  2: {
    title: "사례조사",
    systemPrompt: `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
주어진 요구사항에 대한 국내외 유사 사례를 심층 조사합니다.

다음 JSON 형식으로 응답하세요:
{
  "step_title": "사례조사",
  "domestic_cases": [
    { "name": "사례명", "organization": "기관명", "period": "추진 기간", "description": "상세 설명", "outcomes": "성과 및 효과", "lessons_learned": "시사점" }
  ],
  "international_cases": [
    { "name": "사례명", "country": "국가", "organization": "기관명", "description": "상세 설명", "outcomes": "성과 및 효과", "applicability": "국내 적용 가능성" }
  ],
  "best_practices": ["업계 모범 사례"],
  "common_success_factors": ["공통 성공 요인"],
  "common_failure_factors": ["공통 실패 요인"]
}

중요: 실제 존재하는 구체적인 사례를 제시하고, "~를 수행한다" 형태의 공문서 체를 사용할 것.`,
    buildUser: (body, prevResults) => {
      const { requirementTitle, requirementDescription, category } = body;
      return `다음 요구사항에 대해 국내외 유사 사례를 조사하세요:

**요구사항 제목**: ${requirementTitle}
**요구사항 설명**: ${requirementDescription || "없음"}
**분류**: ${category || "미분류"}
${prevResults ? `\n**이전 단계(배경분석) 결과 참고**:\n${JSON.stringify(prevResults, null, 2).substring(0, 3000)}` : ""}`;
    },
  },
  3: {
    title: "기술분석",
    systemPrompt: `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
주어진 요구사항에 적용 가능한 기술을 심층 분석합니다.

다음 JSON 형식으로 응답하세요:
{
  "step_title": "기술분석",
  "technology_landscape": "기술 동향 개요",
  "candidate_technologies": [
    { "name": "기술명", "category": "분류", "maturity": "성숙도 (도입기/성장기/성숙기)", "description": "상세 설명", "pros": ["장점"], "cons": ["단점"], "vendor_ecosystem": "주요 벤더/제품" }
  ],
  "architecture_options": [
    { "name": "아키텍처명", "description": "구조 설명", "suitability": "적합성 평가" }
  ],
  "security_considerations": ["보안 고려사항"],
  "scalability_analysis": "확장성 분석",
  "integration_requirements": ["연동 요구사항"]
}

중요: 최신 기술 동향을 반영하고, "~를 수행한다" 형태의 공문서 체를 사용할 것.`,
    buildUser: (body, prevResults) => {
      const { requirementTitle, requirementDescription, category } = body;
      return `다음 요구사항에 대해 기술 분석을 수행하세요:

**요구사항 제목**: ${requirementTitle}
**요구사항 설명**: ${requirementDescription || "없음"}
**분류**: ${category || "미분류"}
${prevResults ? `\n**이전 단계 결과 참고**:\n${JSON.stringify(prevResults, null, 2).substring(0, 3000)}` : ""}`;
    },
  },
  4: {
    title: "비교분석",
    systemPrompt: `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
이전 단계의 사례와 기술을 종합적으로 비교·분석합니다.

다음 JSON 형식으로 응답하세요:
{
  "step_title": "비교분석",
  "comparison_matrix": [
    { "criteria": "평가 기준", "weight": "가중치(%)", "options": [{ "name": "옵션명", "score": "점수(1-5)", "rationale": "평가 근거" }] }
  ],
  "cost_benefit_analysis": {
    "estimated_costs": [{ "item": "비용 항목", "amount": "예상 금액", "notes": "비고" }],
    "expected_benefits": [{ "item": "효과 항목", "description": "상세 설명", "measurability": "측정 가능 여부" }],
    "roi_assessment": "투자 대비 효과 분석"
  },
  "risk_assessment": [
    { "risk": "리스크", "probability": "발생 확률(상/중/하)", "impact": "영향도(상/중/하)", "mitigation": "완화 방안" }
  ],
  "recommendation": "최적 방안 추천 및 근거"
}

중요: 객관적이고 정량적인 비교 분석을 제시하고, "~를 수행한다" 형태의 공문서 체를 사용할 것.`,
    buildUser: (body, prevResults) => {
      const { requirementTitle, requirementDescription, category } = body;
      return `다음 요구사항에 대해 비교분석을 수행하세요:

**요구사항 제목**: ${requirementTitle}
**요구사항 설명**: ${requirementDescription || "없음"}
**분류**: ${category || "미분류"}
${prevResults ? `\n**이전 단계들(배경/사례/기술) 결과 참고**:\n${JSON.stringify(prevResults, null, 2).substring(0, 5000)}` : ""}`;
    },
  },
  5: {
    title: "종합보고서",
    systemPrompt: `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
이전 4단계의 분석 결과를 종합하여 최종 자료조사 보고서를 작성합니다.

다음 JSON 형식으로 응답하세요:
{
  "step_title": "종합보고서",
  "executive_summary": "경영진 요약 (5-7문장)",
  "key_findings": ["핵심 발견 사항"],
  "recommended_approach": {
    "strategy": "추천 전략",
    "rationale": "추천 근거",
    "implementation_roadmap": [{ "phase": "단계명", "duration": "기간", "activities": ["활동 내용"] }]
  },
  "resource_requirements": {
    "human_resources": "인력 소요 (인·월)",
    "technology_stack": ["추천 기술 스택"],
    "estimated_budget": "예상 예산 범위"
  },
  "critical_success_factors": ["핵심 성공 요인"],
  "action_items": [{ "item": "조치 사항", "priority": "우선순위(상/중/하)", "responsible": "담당" }],
  "conclusion": "결론 및 제언"
}

중요: 이전 단계 결과를 빠짐없이 반영하여 일관성 있는 종합 보고서를 작성하고, "~를 수행한다" 형태의 공문서 체를 사용할 것.`,
    buildUser: (body, prevResults) => {
      const { requirementTitle, requirementDescription, category } = body;
      return `다음 요구사항에 대한 종합보고서를 작성하세요:

**요구사항 제목**: ${requirementTitle}
**요구사항 설명**: ${requirementDescription || "없음"}
**분류**: ${category || "미분류"}

**전체 단계별 분석 결과**:
${JSON.stringify(prevResults, null, 2).substring(0, 8000)}`;
    },
  },
};

// ── Legacy single-shot research (backward compat) ──

function buildResearchPrompt(body: Record<string, unknown>) {
  const { requirementTitle, requirementDescription, category, rfpContext, userNotes } = body;
  const systemPrompt = `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
주어진 요구사항에 대해 깊이 있는 자료조사를 수행합니다.

다음 JSON 형식으로 응답하세요:
{
  "summary": "요구사항 요약 (2-3문장)",
  "background": "배경 및 필요성 분석",
  "best_practices": ["업계 모범 사례 목록"],
  "technical_approaches": [
    { "approach": "기술 접근 방식명", "description": "상세 설명", "pros": ["장점"], "cons": ["단점"] }
  ],
  "reference_cases": [
    { "name": "사례명", "description": "사례 설명", "relevance": "본 요구사항과의 관련성" }
  ],
  "key_considerations": ["구현 시 핵심 고려사항"],
  "recommended_technologies": ["추천 기술 스택"],
  "risk_factors": ["리스크 요인"],
  "estimated_effort": "예상 투입 공수 (인·월 단위)"
}

중요: "~를 수행한다" 형태의 공문서 체를 사용할 것.`;

  const userMessage = `다음 요구사항에 대해 자료조사를 수행하세요:

**요구사항 제목**: ${requirementTitle}
**요구사항 설명**: ${requirementDescription || "없음"}
**분류**: ${category || "미분류"}
${rfpContext ? `\n**RFP 원문 컨텍스트** (참고용):\n${(rfpContext as string).substring(0, 5000)}` : ""}
${userNotes ? `\n**사용자 참고사항**:\n${userNotes}` : ""}`;

  return { systemPrompt, userMessage };
}

// ── Section / Merge prompts ──

function buildDraftSectionPrompt(body: Record<string, unknown>) {
  const { requirementTitle, requirementDescription, category, researchData, userNotes } = body;
  const systemPrompt = `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 제안서 작성 전문가입니다.
자료조사 결과를 바탕으로 해당 요구사항에 대한 제안서 섹션을 작성합니다.

다음 JSON 형식으로 응답하세요:
{
  "section_title": "섹션 제목",
  "understanding": "요구사항 이해 및 분석 (2-3 문단)",
  "approach": "접근 방안 및 방법론 (상세)",
  "implementation_plan": "구현 계획 (단계별)",
  "deliverables": ["산출물 목록"],
  "schedule": "예상 일정",
  "expected_outcomes": "기대 효과",
  "quality_assurance": "품질 보증 방안"
}

중요: "~를 수행한다" 형태의 공문서 체를 사용할 것.`;

  const userMessage = `다음 요구사항에 대한 제안서 섹션을 작성하세요:

**요구사항 제목**: ${requirementTitle}
**요구사항 설명**: ${requirementDescription || "없음"}
**분류**: ${category || "미분류"}
${researchData ? `\n**자료조사 결과**:\n${JSON.stringify(researchData, null, 2)}` : ""}
${userNotes ? `\n**사용자 참고사항**:\n${userNotes}` : ""}`;

  return { systemPrompt, userMessage };
}

function buildMergePrompt(allSections: unknown) {
  const systemPrompt = `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 제안서 작성 전문가입니다.
개별 요구사항별 제안 내용을 하나의 통합 제안서 문서로 병합합니다.

다음 JSON 형식으로 응답하세요:
{
  "title": "제안서 제목",
  "executive_summary": "경영진 요약 (3-5문장)",
  "table_of_contents": ["목차 항목"],
  "sections": [
    { "section_number": "1", "title": "섹션 제목", "content": "본문 내용 (마크다운 형식)" }
  ],
  "conclusion": "결론 및 기대효과",
  "appendix_notes": "부록 참고사항"
}

중요: 논리적 흐름으로 섹션을 재구성하고 "~를 수행한다" 형태의 공문서 체를 사용할 것.`;

  const userMessage = `다음 개별 제안 섹션들을 하나의 통합 제안서로 병합하세요:\n\n${JSON.stringify(allSections, null, 2)}`;
  return { systemPrompt, userMessage };
}

function buildSynthesizePrompt(body: Record<string, unknown>) {
  const systemPrompt = `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
여러 AI 모델이 동일한 요구사항에 대해 각각 수행한 딥리서치 결과를 취합하여,
가장 정확하고 포괄적인 최종 연구 결과를 작성합니다.

각 모델의 결과를 비교 분석하여:
1. 공통적으로 언급된 핵심 내용은 강화
2. 특정 모델만 언급한 고유한 인사이트는 보완 추가
3. 상충되는 내용은 가장 신뢰할 수 있는 정보를 채택
4. 전체적으로 가장 완성도 높은 종합 결과를 도출

요청된 단계에 맞는 JSON 형식으로 응답하세요. 형식은 해당 단계의 원래 출력 스키마와 동일합니다.

중요: "~를 수행한다" 형태의 공문서 체를 사용할 것.`;

  const { stepKey, stepTitle, modelResults } = body;
  const userMessage = `다음은 여러 AI 모델이 "${stepTitle}" 단계에 대해 각각 수행한 연구 결과입니다.
이를 취합하여 최선의 종합 결과를 작성해주세요.

**분석 단계**: ${stepKey} - ${stepTitle}

${(modelResults as Array<{ model: string; data: unknown }>).map((r: { model: string; data: unknown }, i: number) =>
  `--- 모델 ${i + 1}: ${r.model} ---\n${JSON.stringify(r.data, null, 2)}`
).join("\n\n")}

위 결과들을 종합하여 가장 완성도 높은 단일 연구 결과를 작성하세요.`;

  return { systemPrompt, userMessage };
}

// ── AI call helpers ──


async function callLovableAI(model: string, systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const isOpenAI = model.startsWith("openai/");
  const params: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  };
  if (isOpenAI) {
    params.max_completion_tokens = maxTokens;
  } else {
    params.max_tokens = maxTokens;
    params.temperature = 0.4;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    if (response.status === 402) throw Object.assign(new Error("크레딧이 부족합니다. 워크스페이스에 크레딧을 추가해주세요."), { statusCode: 402 });
    if (response.status === 429) throw Object.assign(new Error("요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요."), { statusCode: 429 });
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callExternalProxy(authHeader: string, model: string, systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const response = await fetch(`${supabaseUrl}/functions/v1/external-ai-proxy`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("External proxy error:", response.status, errorText);
    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.error) throw Object.assign(new Error(parsed.error), { statusCode: response.status });
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode) throw e;
    }
    if (response.status === 402) throw Object.assign(new Error("크레딧이 부족합니다."), { statusCode: 402 });
    if (response.status === 429) throw Object.assign(new Error("요청 한도를 초과했습니다."), { statusCode: 429 });
    throw new Error(`External AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "인증이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "인증에 실패했습니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { mode, model = "google/gemini-3-flash-preview" } = body;

    if (!["research", "deep-research", "section", "merge", "synthesize"].includes(mode)) {
      return new Response(
        JSON.stringify({ error: "올바른 mode를 지정하세요: research | deep-research | section | merge" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isExternal = typeof model === "string" && externalPrefixes.some(p => model.startsWith(p));
    const isLovable = lovableModels.includes(model);
    if (!isLovable && !isExternal) {
      return new Response(
        JSON.stringify({ error: "지원하지 않는 모델입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode !== "merge" && mode !== "synthesize") {
      const { requirementTitle } = body;
      if (typeof requirementTitle !== "string" || requirementTitle.length < 1 || requirementTitle.length > 500) {
        return new Response(
          JSON.stringify({ error: "요구사항 제목이 올바르지 않습니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    let systemPrompt: string;
    let userMessage: string;
    let maxTokens: number;

    if (mode === "deep-research") {
      // 5-step deep research mode
      const { researchStep, previousResults } = body;
      const step = Number(researchStep);
      if (!step || step < 1 || step > 5) {
        return new Response(
          JSON.stringify({ error: "researchStep은 1-5 사이여야 합니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const stepConfig = RESEARCH_STEP_PROMPTS[step];
      systemPrompt = stepConfig.systemPrompt;
      userMessage = stepConfig.buildUser(body, previousResults);
      maxTokens = step === 5 ? 8000 : 6000;
    } else if (mode === "research") {
      ({ systemPrompt, userMessage } = buildResearchPrompt(body));
      maxTokens = 6000;
    } else if (mode === "section") {
      ({ systemPrompt, userMessage } = buildDraftSectionPrompt(body));
      maxTokens = 6000;
    } else if (mode === "synthesize") {
      ({ systemPrompt, userMessage } = buildSynthesizePrompt(body));
      maxTokens = 8000;
    } else {
      ({ systemPrompt, userMessage } = buildMergePrompt(body.allSections));
      maxTokens = 12000;
    }

    let content: string;
    if (isExternal) {
      content = await callExternalProxy(authHeader, model, systemPrompt, userMessage, maxTokens);
    } else {
      content = await callLovableAI(model, systemPrompt, userMessage, maxTokens);
    }

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }

    const result = JSON.parse(content);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    console.error("Proposal AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "AI 처리 중 오류가 발생했습니다." }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
