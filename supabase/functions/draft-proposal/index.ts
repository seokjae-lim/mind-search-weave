import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supportedModels = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-3-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5.2",
];

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

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
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

    const body = await req.json();
    const {
      requirementTitle,
      requirementDescription,
      category,
      researchData,
      userNotes,
      model = "google/gemini-3-flash-preview",
      mode = "section",
      allSections,
    } = body;

    if (typeof model !== "string" || !supportedModels.includes(model)) {
      return new Response(
        JSON.stringify({ error: "지원하지 않는 모델입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt: string;
    let userMessage: string;

    if (mode === "merge") {
      systemPrompt = `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 제안서 작성 전문가입니다.
개별 요구사항별 제안 내용을 하나의 통합 제안서 문서로 병합합니다.

다음 JSON 형식으로 응답하세요:

{
  "title": "제안서 제목",
  "executive_summary": "경영진 요약 (3-5문장)",
  "table_of_contents": ["목차 항목"],
  "sections": [
    {
      "section_number": "1",
      "title": "섹션 제목",
      "content": "본문 내용 (마크다운 형식)"
    }
  ],
  "conclusion": "결론 및 기대효과",
  "appendix_notes": "부록 참고사항"
}

중요 지침:
1. 공공부문 ISP·ISMP 가이드라인에 맞는 공문서 체로 작성할 것
2. 논리적 흐름으로 섹션을 재구성할 것
3. 중복 내용을 제거하고 일관성을 유지할 것`;

      userMessage = `다음 개별 제안 섹션들을 하나의 통합 제안서로 병합하세요:\n\n${JSON.stringify(allSections, null, 2)}`;
    } else {
      if (typeof requirementTitle !== "string" || requirementTitle.length < 1) {
        return new Response(
          JSON.stringify({ error: "요구사항 제목이 올바르지 않습니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      systemPrompt = `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 제안서 작성 전문가입니다.
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

중요 지침:
1. "~를 수행한다" 형태의 공문서 체를 사용할 것
2. 구체적이고 실행 가능한 내용을 제시할 것
3. 공공부문 평가위원의 관점에서 설득력 있는 내용을 작성할 것
4. 자료조사 결과를 충분히 반영할 것`;

      userMessage = `다음 요구사항에 대한 제안서 섹션을 작성하세요:

**요구사항 제목**: ${requirementTitle}
**요구사항 설명**: ${requirementDescription || "없음"}
**분류**: ${category || "미분류"}
${researchData ? `\n**자료조사 결과**:\n${JSON.stringify(researchData, null, 2)}` : ""}
${userNotes ? `\n**사용자 참고사항**:\n${userNotes}` : ""}`;
    }

    const isOpenAIModel = model.startsWith("openai/");
    const modelParams: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    };

    if (isOpenAIModel) {
      modelParams.max_completion_tokens = mode === "merge" ? 12000 : 6000;
    } else {
      modelParams.max_tokens = mode === "merge" ? 12000 : 6000;
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "크레딧이 부족합니다. 워크스페이스에 크레딧을 추가해주세요." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    console.error("Draft proposal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "제안서 초안 작성 중 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
