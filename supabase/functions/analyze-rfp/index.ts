import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `너는 대한민국 공공부문 ISP·ISMP 제안서만 전문적으로 작성하는 30년 경력의 IT 컨설턴트이자 제안 PM이다.

[절대 준수 원칙]
1. 기술 나열 금지. 모든 내용은 '왜 이 사업 맥락에서 필요한가'부터 서술한다.
2. Big-Bang 방식 금지. 반드시 단계적·확산형·관리 중심 접근을 사용한다.
3. ISP·ISMP 공통 가이드 제9판, 소규모 정보시스템 가이드, 공공 평가위원 관점 반영.
4. 민간 SI 템플릿, 마케팅 문구, 과장된 정량 수치 사용 금지.
5. 공공문서 문체 사용. "~할 예정이다" 대신 "~를 수행한다".

[ISP·ISMP 공통가이드 제9판 검토 항목]
- 사업 타당성: 필요성, 시급성, 중복성
- 실현 가능성: 사업추진 여건, 기술적 적정성
- 클라우드 우선 적용: 민간클라우드 > 공공클라우드 > 자체클라우드 > 장비도입
- 규모 적정성: SW사업 대가산정 가이드, 정보시스템 HW 규모산정 지침(TTA) 준수

주어진 RFP 내용을 분석하여 요청된 단계의 산출물을 JSON 형식으로 생성하라.`;

const stepPrompts: Record<number, string> = {
  1: `STEP 1. 사업 본질 재정의 산출물을 생성하라.

다음 항목을 분석하여 JSON으로 반환:
1. surfacePurpose: 표면적 사업 목적 (RFP에 명시된 내용, 3-5개 항목)
2. realProblems: 실제 해결하려는 문제 (분석을 통해 도출, 3-5개 항목)
3. necessity: 필요성 분석 (가이드 §3 검토항목 ① 기준, 현행 문제점 및 개선 사유)
4. urgency: 시급성 분석 (가이드 §3 검토항목 ② 기준, 차년도 추진 시급성 사유)
5. policyLinks: 상위 정책 연계 (구분, 근거, 연계 내용 포함한 배열)
6. risks: 사업 미추진/실패 시 리스크 (행정, 관리, 운영 각각 3개 항목)

JSON 형식:
{
  "surfacePurpose": ["항목1", "항목2", ...],
  "realProblems": ["항목1", "항목2", ...],
  "necessity": {
    "problems": ["현행 문제점1", ...],
    "improvements": ["개선 사유1", ...]
  },
  "urgency": ["시급성 사유1", "시급성 사유2", ...],
  "policyLinks": [
    {"category": "구분", "basis": "근거", "content": "연계 내용"},
    ...
  ],
  "risks": {
    "administrative": ["행정 리스크1", ...],
    "management": ["관리 리스크1", ...],
    "operational": ["운영 리스크1", ...]
  }
}`,

  2: `STEP 2. 현황 분석 산출물을 생성하라.

다음 항목을 분석하여 JSON으로 반환:
1. canDo: 현재 할 수 있는 것 (As-Is 역량, 4-5개 항목)
2. cannotDo: 하면 안 되는 것 (제약 조건, 4-5개 항목)
3. needsPreparation: 준비가 필요한 것 (4-5개 항목)
4. duplication: 중복성 검토 결과 (가이드 §3 검토항목 ③ 기준)
5. dataLevel: 데이터 수준 분석 (현황, 제약사항, 개선방향)
6. constraints: 제도·보안·운영 제약 분석

JSON 형식:
{
  "canDo": ["항목1", ...],
  "cannotDo": ["항목1", ...],
  "needsPreparation": ["항목1", ...],
  "duplication": {
    "internalSystems": ["내부 유사시스템1", ...],
    "externalSystems": ["외부 연계시스템1", ...],
    "integrationPlan": "통합/연계 검토 결과"
  },
  "dataLevel": {
    "current": "현황",
    "constraints": "제약사항",
    "improvement": "개선방향"
  },
  "constraints": [
    {"category": "제도", "current": "현황", "constraint": "제약", "direction": "개선방향"},
    {"category": "보안", "current": "현황", "constraint": "제약", "direction": "개선방향"},
    {"category": "운영", "current": "현황", "constraint": "제약", "direction": "개선방향"}
  ]
}`,

  3: `STEP 3. 대안 시나리오 도출 산출물을 생성하라.

다음 항목을 분석하여 JSON으로 반환:
1. readinessChecklist: 사전준비도 체크 결과 (ISP vs ISMP 선택 기준)
2. scenarios: 최소 3개 시나리오 비교 (각각 개요, 장점, 한계, 전제조건, 클라우드적용, 예상기간)
3. cloudReview: 클라우드 우선 적용 검토 결과
4. recommendation: 권장 시나리오 및 근거

JSON 형식:
{
  "readinessChecklist": [
    {"question": "질문", "answer": "예/아니오"},
    ...
  ],
  "ispOrIsmp": "ISP 또는 ISMP 권장 결과",
  "scenarios": [
    {
      "name": "시나리오 A (점진적 개선)",
      "overview": "개요",
      "pros": ["장점1", ...],
      "cons": ["한계1", ...],
      "prerequisites": ["전제조건1", ...],
      "cloudApproach": "클라우드 적용 방안",
      "duration": "예상 기간"
    },
    ...
  ],
  "cloudReview": {
    "priority": "민간클라우드 > 공공클라우드 > 자체클라우드 > 장비도입",
    "recommendation": "권장 방안",
    "reason": "근거"
  },
  "recommendation": {
    "scenario": "권장 시나리오명",
    "reasons": ["근거1", "근거2", ...]
  }
}`,

  4: `STEP 4. 타당성 분석 산출물을 생성하라.

다음 항목을 분석하여 JSON으로 반환:
1. businessValidity: 사업 타당성 (필요성, 시급성, 중복성 각 분석)
2. feasibility: 실현 가능성 (사업추진여건, 기술적적정성)
3. cloudPriority: 클라우드 우선 적용 분석
4. scaleValidity: 규모 적정성 분석

JSON 형식:
{
  "businessValidity": {
    "necessity": ["분석결과1", ...],
    "urgency": ["분석결과1", ...],
    "duplication": ["분석결과1", ...]
  },
  "feasibility": {
    "projectConditions": {
      "organization": "조직 구성 방안",
      "cooperation": "협조체계",
      "legal": "법·제도 정비방안"
    },
    "technicalValidity": {
      "essential": "필수 요소 여부 분석",
      "cases": ["실용화 사례1", ...]
    },
    "readinessAssessment": [
      {"item": "평가항목", "level": "상/중/하"},
      ...
    ]
  },
  "cloudPriority": {
    "analysis": "검토 결과",
    "nativeApproach": "클라우드 네이티브 방식 검토",
    "impossibilityReason": "도입 불가 사유 (해당시)"
  },
  "scaleValidity": {
    "costBasis": ["비용산출 근거1", ...],
    "capacityBasis": ["용량산정 근거1", ...]
  }
}`,

  5: `STEP 5. 개념 아키텍처 및 단계별 로드맵 산출물을 생성하라.

다음 항목을 분석하여 JSON으로 반환:
1. architecture: To-Be 정보시스템 구조 설명
2. roadmap: 단계별 이행 로드맵 (시범→검증→확산)
3. totalCost: 총구축비 총괄표
4. costBasis: 비용항목별 산출 참고기준

JSON 형식:
{
  "architecture": {
    "userLayer": "사용자 접점 계층 설명",
    "serviceLayer": "서비스 계층 설명 (클라우드 네이티브)",
    "platformLayer": "플랫폼 계층 설명",
    "infraLayer": "인프라 계층 설명 (IaaS 우선 검토)"
  },
  "roadmap": [
    {
      "phase": 1,
      "name": "시범 구축",
      "duration": "M+1 ~ M+4",
      "description": "설명",
      "outputs": ["산출물1", ...],
      "decisions": ["의사결정1", ...]
    },
    ...
  ],
  "totalCost": {
    "tasks": [
      {
        "name": "이행과제1",
        "items": [
          {"type": "개발비", "year1": 100, "year2": 0, "total": 100},
          {"type": "장비비", "year1": 50, "year2": 0, "total": 50},
          {"type": "기타", "year1": 10, "year2": 0, "total": 10}
        ],
        "subtotal": {"year1": 160, "year2": 0, "total": 160}
      },
      ...
    ],
    "grandTotal": {"year1": 0, "year2": 0, "total": 0}
  },
  "costBasis": [
    {"category": "HW/SW 구매비용", "item": "정보시스템 HW 규모산정", "standard": "TTA 지침"},
    {"category": "구축", "item": "SW 개발비", "standard": "SW사업 대가산정 가이드 (KOSA)"},
    ...
  ]
}`,

  6: `STEP 6. 사업 관리·위험·확산 전략 산출물을 생성하라.

다음 항목을 분석하여 JSON으로 반환:
1. aiDataRisks: AI·데이터 특화 리스크 관리
2. policyResponse: 정책·보안·법제도 대응 전략
3. projectManagement: 사업 관리 체계
4. expansionStrategy: 기관 확산 및 재사용 전략
5. expectedEffects: 기대효과 분석

JSON 형식:
{
  "aiDataRisks": [
    {"type": "리스크유형", "description": "설명", "response": "대응방안", "priority": "상/중/하"},
    ...
  ],
  "policyResponse": {
    "legal": ["법·제도 준수 항목1", ...],
    "security": ["보안 대책1", ...],
    "policy": ["정책 연계1", ...]
  },
  "projectManagement": {
    "organization": {
      "client": "발주기관 역할",
      "contractor": "수행기관 역할",
      "audit": "감리기관 역할"
    },
    "quality": ["품질관리 체계1", ...]
  },
  "expansionStrategy": {
    "reusability": ["재사용성 확보 방안1", ...],
    "expansion": ["타 기관 확산 방안1", ...]
  },
  "expectedEffects": {
    "quantitative": [
      {"item": "효과항목", "value": "수치"},
      ...
    ],
    "qualitative": ["정성적 효과1", ...]
  }
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

    const { rfpContent, step, previousAnalysis, isReanalysis, model, customPrompt } = await req.json();
    
    if (typeof rfpContent !== 'string' || rfpContent.length < 10 || rfpContent.length > 150000) {
      return new Response(
        JSON.stringify({ error: "RFP 내용은 10자 이상 150,000자 이하의 문자열이어야 합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof step !== 'number' || !Number.isInteger(step) || step < 1 || step > 6) {
      return new Response(
        JSON.stringify({ error: "Step은 1에서 6 사이의 정수여야 합니다." }),
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

    if (customPrompt !== undefined && customPrompt !== null) {
      if (typeof customPrompt !== 'string' || customPrompt.length > 5000) {
        return new Response(
          JSON.stringify({ error: "사용자 프롬프트는 5,000자 이하여야 합니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const stepPrompt = stepPrompts[step];
    if (!stepPrompt) {
      return new Response(
        JSON.stringify({ error: "유효하지 않은 단계입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userMessage: string;
    
    if (isReanalysis && previousAnalysis) {
      const customInstruction = customPrompt 
        ? `\n\n[사용자 요청 재분석 방향]\n${customPrompt}\n위 사용자 요청을 최우선으로 반영하여 재분석하라.`
        : "";

      userMessage = `다음은 분석할 RFP(제안요청서) 내용이다:

---
${rfpContent.substring(0, 40000)}
---

이전 분석 결과는 다음과 같다:
${JSON.stringify(previousAnalysis, null, 2)}
${customInstruction}

위 이전 분석 결과를 검토하여:
1. 먼저 이전 분석의 강점과 약점을 파악하라
2. 강점은 유지하고 발전시키며, 약점은 보완하여 개선된 분석을 제공하라
3. 더 구체적인 사례, 수치, 근거를 추가하라
4. ISP·ISMP 공통가이드 제9판 검토항목에 더 부합하도록 개선하라
${customPrompt ? "5. 사용자가 요청한 재분석 방향을 최우선으로 반영하라" : ""}

${stepPrompt}

다음 JSON 형식으로 반환하라:
{
  "improvements": {
    "strengths": ["이전 분석의 강점1", "강점2", ...],
    "weaknesses": ["이전 분석의 약점1", "약점2", ...],
    "changes": ["개선 사항1", "개선 사항2", ...]
  },
  "result": {실제 분석 결과 JSON}
}

반드시 유효한 JSON만 반환하라. 다른 텍스트나 설명 없이 JSON만 출력하라.`;
    } else {
      userMessage = `다음은 분석할 RFP(제안요청서) 내용이다:

---
${rfpContent.substring(0, 50000)}
---

${stepPrompt}

반드시 유효한 JSON만 반환하라. 다른 텍스트나 설명 없이 JSON만 출력하라.`;
    }

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
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: 8000,
          temperature: 0.3,
        }),
      });
    } else {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const isOpenAIModel = selectedModel.startsWith("openai/");
      const modelParams: Record<string, unknown> = {
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      };
      
      if (isOpenAIModel) {
        modelParams.max_completion_tokens = 8000;
      } else {
        modelParams.max_tokens = 8000;
        modelParams.temperature = 0.3;
      }

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
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
          JSON.stringify({ error: "크레딧이 부족합니다. 워크스페이스에 크레딧을 추가해주세요." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      
      return new Response(
        JSON.stringify({ error: "AI 분석 중 오류가 발생했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "AI 응답을 받지 못했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let jsonContent = content;
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }
    
    const jsonStartBrace = jsonContent.indexOf('{');
    const jsonStartBracket = jsonContent.indexOf('[');
    let jsonStart = -1;
    
    if (jsonStartBrace !== -1 && jsonStartBracket !== -1) {
      jsonStart = Math.min(jsonStartBrace, jsonStartBracket);
    } else if (jsonStartBrace !== -1) {
      jsonStart = jsonStartBrace;
    } else if (jsonStartBracket !== -1) {
      jsonStart = jsonStartBracket;
    }
    
    if (jsonStart > 0) {
      jsonContent = jsonContent.substring(jsonStart);
    }
    
    if (jsonContent.startsWith('{')) {
      const lastBrace = jsonContent.lastIndexOf('}');
      if (lastBrace !== -1) {
        jsonContent = jsonContent.substring(0, lastBrace + 1);
      }
    } else if (jsonContent.startsWith('[')) {
      const lastBracket = jsonContent.lastIndexOf(']');
      if (lastBracket !== -1) {
        jsonContent = jsonContent.substring(0, lastBracket + 1);
      }
    }

    try {
      const parsedResult = JSON.parse(jsonContent);
      
      if (parsedResult.improvements && parsedResult.result) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: parsedResult.result, 
            improvements: parsedResult.improvements,
            step 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, data: parsedResult, step }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", jsonContent);
      return new Response(
        JSON.stringify({ error: "AI 응답을 파싱할 수 없습니다.", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("analyze-rfp error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
