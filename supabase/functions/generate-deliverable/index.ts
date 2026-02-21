import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const deliverablePrompts: Record<string, string> = {
  definition: `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
주어진 요구사항에 대한 **요구사항 정의서**를 작성합니다.

다음 항목을 포함하여 JSON 형식으로 작성하세요:
{
  "requirement_id": "요구사항 ID",
  "title": "요구사항 명",
  "purpose": "목적 및 필요성",
  "scope": "범위",
  "detailed_requirements": ["세부 요구사항 목록"],
  "acceptance_criteria": ["인수 기준"],
  "constraints": ["제약사항"],
  "dependencies": ["연관 요구사항"],
  "expected_effects": ["기대효과"]
}`,

  proposal: `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
주어진 요구사항에 대한 **기술 제안서**를 작성합니다.

다음 항목을 포함하여 JSON 형식으로 작성하세요:
{
  "requirement_id": "요구사항 ID",
  "title": "제안 제목",
  "current_state": "현황 분석",
  "proposed_solution": "제안 솔루션",
  "technology_stack": ["기술 스택"],
  "architecture": "아키텍처 개요",
  "implementation_approach": "구현 방안",
  "risk_factors": ["리스크 요소"],
  "mitigation_strategies": ["대응 방안"],
  "success_factors": ["성공 요소"]
}`,

  wbs: `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
주어진 요구사항에 대한 **WBS 및 일정표**를 작성합니다.

다음 항목을 포함하여 JSON 형식으로 작성하세요:
{
  "requirement_id": "요구사항 ID",
  "project_name": "프로젝트명",
  "phases": [
    {
      "phase_name": "단계명",
      "phase_code": "단계 코드 (예: P1)",
      "duration_weeks": 0,
      "tasks": [
        {
          "task_code": "작업 코드 (예: P1-T1)",
          "task_name": "작업명",
          "duration_days": 0,
          "deliverables": ["산출물"],
          "resources": ["투입 인력"]
        }
      ]
    }
  ],
  "milestones": [
    {
      "name": "마일스톤명",
      "target_week": 0
    }
  ],
  "total_duration_weeks": 0
}`,

  estimate: `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
주어진 요구사항에 대한 **견적서 및 비용 산정**을 작성합니다.

다음 항목을 포함하여 JSON 형식으로 작성하세요:
{
  "requirement_id": "요구사항 ID",
  "title": "견적 제목",
  "cost_breakdown": [
    {
      "category": "비용 항목",
      "items": [
        {
          "item_name": "세부 항목",
          "quantity": 0,
          "unit": "단위 (인일, 식, 개월 등)",
          "unit_price": 0,
          "total_price": 0,
          "notes": "비고"
        }
      ],
      "subtotal": 0
    }
  ],
  "manpower_plan": [
    {
      "role": "역할",
      "grade": "등급",
      "man_months": 0,
      "unit_price": 0,
      "total_price": 0
    }
  ],
  "total_cost": 0,
  "assumptions": ["산정 가정"],
  "exclusions": ["제외 항목"]
}`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "인증이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "인증에 실패했습니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

    const { 
      requirement, 
      deliverableType, 
      model = "google/gemini-3-flash-preview",
      additionalContext = ""
    } = await req.json();

    const ALLOWED_DELIVERABLE_TYPES = ['definition', 'proposal', 'wbs', 'estimate'];
    
    if (!deliverableType || typeof deliverableType !== 'string' || !ALLOWED_DELIVERABLE_TYPES.includes(deliverableType)) {
      return new Response(
        JSON.stringify({ error: "지원하지 않는 산출물 유형입니다. (definition, proposal, wbs, estimate 중 선택)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requirement || typeof requirement !== 'object') {
      return new Response(
        JSON.stringify({ error: "올바른 요구사항 객체가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requirement.requirement_number || typeof requirement.requirement_number !== 'string') {
      return new Response(
        JSON.stringify({ error: "요구사항 번호(requirement_number)가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requirement.title || typeof requirement.title !== 'string') {
      return new Response(
        JSON.stringify({ error: "요구사항 제목(title)이 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (additionalContext !== undefined && additionalContext !== null && additionalContext !== "") {
      if (typeof additionalContext !== 'string' || additionalContext.length > 10000) {
        return new Response(
          JSON.stringify({ error: "추가 컨텍스트는 10,000자 이하여야 합니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supportedModels = [
      "google/gemini-3-flash-preview",
      "google/gemini-2.5-pro",
      "google/gemini-2.5-flash",
      "google/gemini-3-pro-preview",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5.2"
    ];

    if (model !== "google/gemini-3-flash-preview") {
      if (typeof model !== 'string' || !supportedModels.includes(model)) {
        return new Response(
          JSON.stringify({ error: "지원하지 않는 모델입니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const systemPrompt = deliverablePrompts[deliverableType];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userMessage = `다음 요구사항에 대한 산출물을 작성하세요:

요구사항 번호: ${requirement.requirement_number}
제목: ${requirement.title}
설명: ${requirement.description || "없음"}
카테고리: ${requirement.category || "미분류"}
우선순위: ${requirement.priority || "medium"}

${additionalContext ? `추가 컨텍스트:\n${additionalContext}` : ""}`;

    const isOpenAIModel = model.startsWith("openai/");
    
    const modelParams: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
    };
    
    if (isOpenAIModel) {
      modelParams.max_completion_tokens = 8000;
    } else {
      modelParams.max_tokens = 8000;
      modelParams.temperature = 0.4;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(modelParams),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "크레딧이 부족합니다. 충전 후 다시 시도해주세요." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }

    const result = JSON.parse(content);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate deliverable error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "산출물 생성 중 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
