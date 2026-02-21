import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const extractionPrompt = `당신은 30년 경력의 IT 컨설턴트이자 공공부문 ISP/ISMP 전문가입니다.
RFP(제안요청서) 또는 CNR(컨설팅 요구사항) 문서에서 요구사항을 추출하고 분석합니다.

다음 형식으로 JSON을 반환하세요:

{
  "requirements": [
    {
      "requirement_number": "요구사항 번호 (예: CNR-001, REQ-01)",
      "title": "요구사항 제목",
      "description": "상세 설명",
      "category": "기능/비기능/성능/보안/기술/관리 중 하나",
      "priority": "high/medium/low 중 하나",
      "source": "출처 (문서 섹션명 또는 페이지)",
      "deliverables": ["요구되는 산출물 목록"]
    }
  ]
}

중요 지침:
1. 모든 요구사항을 빠짐없이 추출할 것
2. CNR 문서에 명시된 산출물 정보를 반드시 포함할 것
3. 요구사항 간의 연관성과 우선순위를 고려할 것
4. 공공부문 ISP/ISMP 가이드라인에 맞게 분류할 것`;

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

    const { rfpContent, model = "google/gemini-3-flash-preview" } = await req.json();

    if (typeof rfpContent !== 'string' || rfpContent.length < 10 || rfpContent.length > 150000) {
      return new Response(
        JSON.stringify({ error: "RFP 내용은 10자 이상 150,000자 이하의 문자열이어야 합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableModels = [
      "google/gemini-3-flash-preview",
      "google/gemini-2.5-pro",
      "google/gemini-2.5-flash",
      "google/gemini-3-pro-preview",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5.2"
    ];

    const externalPrefixes = ["huggingface/", "deepseek/", "anthropic/", "moonshot/", "openrouter/"];
    const isExternalModel = model && typeof model === "string" && externalPrefixes.some(p => model.startsWith(p));
    const isLovableModel = !model || lovableModels.includes(model);

    if (!isLovableModel && !isExternalModel) {
      return new Response(
        JSON.stringify({ error: "지원하지 않는 모델입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedModel = isLovableModel ? (model || "google/gemini-3-flash-preview") : model;

    const messages = [
      { role: "system", content: extractionPrompt },
      { role: "user", content: `다음 RFP/CNR 문서에서 모든 요구사항을 추출하세요:\n\n${rfpContent}` }
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
        body: JSON.stringify({ model: selectedModel, messages, max_tokens: 8000, temperature: 0.3 }),
      });
    } else {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const isOpenAIModel = selectedModel.startsWith("openai/");
      const modelParams: Record<string, unknown> = { model: selectedModel, messages };
      if (isOpenAIModel) { modelParams.max_completion_tokens = 8000; }
      else { modelParams.max_tokens = 8000; modelParams.temperature = 0.3; }

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(modelParams),
      });
    }

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
    console.error("Extract requirements error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "요구사항 추출 중 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
