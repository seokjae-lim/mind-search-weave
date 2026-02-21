import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProviderConfig {
  name: string;
  baseUrl: string;
  modelMap: Record<string, string>;
  buildHeaders: (apiKey: string) => Record<string, string>;
  openaiCompatible: boolean;
  maxTokensParam?: string;
}

const providers: Record<string, ProviderConfig> = {
  huggingface: {
    name: "HuggingFace",
    baseUrl: "https://router.huggingface.co/v1/chat/completions",
    modelMap: {
      "huggingface/qwen2.5-72b": "Qwen/Qwen2.5-72B-Instruct",
      "huggingface/qwen2.5-coder-32b": "Qwen/Qwen2.5-Coder-32B-Instruct",
      "huggingface/llama-3.1-70b": "meta-llama/Llama-3.1-70B-Instruct",
      "huggingface/llama-3.3-70b": "meta-llama/Llama-3.3-70B-Instruct",
      "huggingface/mistral-nemo": "mistralai/Mistral-Nemo-Instruct-2407",
      "huggingface/phi-4": "microsoft/phi-4",
    },
    buildHeaders: (apiKey: string) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    openaiCompatible: true,
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    modelMap: {
      "deepseek/deepseek-chat": "deepseek-chat",
      "deepseek/deepseek-reasoner": "deepseek-reasoner",
    },
    buildHeaders: (apiKey: string) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    openaiCompatible: true,
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1/messages",
    modelMap: {
      "anthropic/claude-3.5-sonnet": "claude-3-5-sonnet-20241022",
      "anthropic/claude-3.5-haiku": "claude-3-5-haiku-20241022",
    },
    buildHeaders: (apiKey: string) => ({
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    }),
    openaiCompatible: false,
    maxTokensParam: "max_tokens",
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    modelMap: {
      "openrouter/auto": "openrouter/auto",
    },
    buildHeaders: (apiKey: string) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    openaiCompatible: true,
  },
  kimi: {
    name: "Kimi (Moonshot)",
    baseUrl: "https://api.moonshot.cn/v1/chat/completions",
    modelMap: {
      "moonshot/kimi": "moonshot-v1-128k",
    },
    buildHeaders: (apiKey: string) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    openaiCompatible: true,
  },
};

function resolveProvider(modelId: string): { provider: ProviderConfig; resolvedModel: string } | null {
  for (const [, config] of Object.entries(providers)) {
    if (config.modelMap[modelId]) {
      return { provider: config, resolvedModel: config.modelMap[modelId] };
    }
  }
  return null;
}

function getProviderKeyName(modelId: string): string {
  const prefix = modelId.split("/")[0];
  return prefix;
}

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

    const userId = claimsData.claims.sub as string;
    const body = await req.json();
    const { model, messages, max_tokens = 8000, temperature = 0.3 } = body;

    if (!model || typeof model !== "string") {
      return new Response(
        JSON.stringify({ error: "모델을 지정해주세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolved = resolveProvider(model);
    if (!resolved) {
      return new Response(
        JSON.stringify({ error: `지원하지 않는 외부 모델입니다: ${model}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { provider, resolvedModel } = resolved;
    const providerKey = getProviderKeyName(model);

    const { data: keyData, error: keyError } = await supabaseClient
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("provider", providerKey)
      .eq("is_active", true)
      .maybeSingle();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: `${provider.name} API 키가 설정되지 않았습니다. 설정 페이지에서 API 키를 입력해주세요.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = keyData.api_key;

    let fetchBody: Record<string, unknown>;
    const fetchHeaders = provider.buildHeaders(apiKey);

    if (provider.openaiCompatible) {
      fetchBody = {
        model: resolvedModel,
        messages,
        max_tokens,
        temperature,
      };
    } else {
      const systemMsg = messages.find((m: { role: string }) => m.role === "system");
      const otherMsgs = messages.filter((m: { role: string }) => m.role !== "system");

      fetchBody = {
        model: resolvedModel,
        max_tokens,
        messages: otherMsgs,
      };
      if (systemMsg) {
        fetchBody.system = systemMsg.content;
      }
    }

    const response = await fetch(provider.baseUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify(fetchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${provider.name} API error:`, response.status, errorText);

      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: `${provider.name} API 키가 유효하지 않습니다. 설정에서 확인해주세요.` }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: `${provider.name} 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `${provider.name} API 오류: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    let content: string;
    if (provider.openaiCompatible) {
      content = data.choices?.[0]?.message?.content || "";
    } else {
      content = data.content?.[0]?.text || "";
    }

    return new Response(
      JSON.stringify({
        choices: [{ message: { content, role: "assistant" } }],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("External AI proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "외부 AI 호출 중 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
