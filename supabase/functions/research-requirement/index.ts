import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      rfpContext,
      userNotes,
      model = "google/gemini-3-flash-preview",
    } = body;

    if (typeof requirementTitle !== "string" || requirementTitle.length < 1 || requirementTitle.length > 500) {
      return new Response(
        JSON.stringify({ error: "요구사항 제목이 올바르지 않습니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const isExternalModel = typeof model === "string" && externalPrefixes.some(p => model.startsWith(p));
    const isLovModel = lovableModels.includes(model);
    if (!isLovModel && !isExternalModel) {
      return new Response(
        JSON.stringify({ error: "지원하지 않는 모델입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
주어진 요구사항에 대해 깊이 있는 자료조사를 수행합니다.

다음 내용을 포함하여 JSON 형식으로 응답하세요:

{
  "summary": "요구사항 요약 (2-3문장)",
  "background": "배경 및 필요성 분석",
  "best_practices": ["업계 모범 사례 목록"],
  "technical_approaches": [
    {
      "approach": "기술 접근 방식명",
      "description": "상세 설명",
      "pros": ["장점"],
      "cons": ["단점"]
    }
  ],
  "reference_cases": [
    {
      "name": "사례명",
      "description": "사례 설명",
      "relevance": "본 요구사항과의 관련성"
    }
  ],
  "key_considerations": ["구현 시 핵심 고려사항"],
  "recommended_technologies": ["추천 기술 스택"],
  "risk_factors": ["리스크 요인"],
  "estimated_effort": "예상 투입 공수 (인·월 단위)"
}

중요 지침:
1. 공공부문 ISP·ISMP 가이드라인에 맞게 분석할 것
2. 실질적이고 구체적인 내용을 제공할 것
3. 대한민국 공공부문 환경에 맞는 사례와 기술을 제시할 것
4. "~를 수행한다" 형태의 공문서 체를 사용할 것`;

    const userMessage = `다음 요구사항에 대해 자료조사를 수행하세요:

**요구사항 제목**: ${requirementTitle}
**요구사항 설명**: ${requirementDescription || "없음"}
**분류**: ${category || "미분류"}
${rfpContext ? `\n**RFP 원문 컨텍스트** (참고용):\n${rfpContext.substring(0, 5000)}` : ""}
${userNotes ? `\n**사용자 참고사항**:\n${userNotes}` : ""}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    let response: Response;

    if (isExternalModel) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      response = await fetch(`${supabaseUrl}/functions/v1/external-ai-proxy`, {
        method: "POST",
        headers: {
          Authorization: authHeader!,
          "Content-Type": "application/json",
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        },
        body: JSON.stringify({ model, messages, max_tokens: 6000, temperature: 0.4 }),
      });
    } else {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const isOpenAIModel = model.startsWith("openai/");
      const modelParams: Record<string, unknown> = { model, messages };
      if (isOpenAIModel) { modelParams.max_completion_tokens = 6000; }
      else { modelParams.max_tokens = 6000; modelParams.temperature = 0.4; }

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(modelParams),
      });
    }

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
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error) {
          return new Response(
            JSON.stringify({ error: parsed.error }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch { /* ignore */ }
      throw new Error(`AI error: ${response.status}`);
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
    console.error("Research requirement error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "자료조사 중 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
