import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserApiKey {
  id: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const providerInfo: Record<string, { name: string; description: string; docsUrl: string; placeholder: string }> = {
  huggingface: {
    name: "HuggingFace",
    description: "Qwen, Llama, Mistral 등 오픈소스 모델 (무료 티어 제공)",
    docsUrl: "https://huggingface.co/settings/tokens",
    placeholder: "hf_...",
  },
  deepseek: {
    name: "DeepSeek",
    description: "DeepSeek-V3, DeepSeek-R1 추론 모델",
    docsUrl: "https://platform.deepseek.com/api_keys",
    placeholder: "sk-...",
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude 3.5 Sonnet/Haiku 모델",
    docsUrl: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-...",
  },
  moonshot: {
    name: "Kimi (Moonshot)",
    description: "Kimi 128K 긴 컨텍스트 특화 모델",
    docsUrl: "https://platform.moonshot.cn/console/api-keys",
    placeholder: "sk-...",
  },
  openrouter: {
    name: "OpenRouter",
    description: "여러 모델을 하나의 API로 접근 (통합 게이트웨이)",
    docsUrl: "https://openrouter.ai/keys",
    placeholder: "sk-or-...",
  },
};

export function useUserApiKeys() {
  const [keys, setKeys] = useState<UserApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setKeys([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_api_keys")
      .select("id, provider, is_active, created_at, updated_at")
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Failed to fetch API keys:", error);
    } else {
      setKeys(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const saveKey = useCallback(async (provider: string, apiKey: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("로그인이 필요합니다.");
      return false;
    }

    const { error } = await supabase
      .from("user_api_keys")
      .upsert(
        {
          user_id: session.user.id,
          provider,
          api_key: apiKey,
          is_active: true,
        } as any,
        { onConflict: "user_id,provider" }
      );

    if (error) {
      toast.error(`API 키 저장 실패: ${error.message}`);
      return false;
    }

    toast.success(`${providerInfo[provider]?.name || provider} API 키가 저장되었습니다.`);
    await fetchKeys();
    return true;
  }, [fetchKeys]);

  const deleteKey = useCallback(async (provider: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { error } = await supabase
      .from("user_api_keys")
      .delete()
      .eq("user_id", session.user.id)
      .eq("provider", provider);

    if (error) {
      toast.error("API 키 삭제 실패");
      return false;
    }

    toast.success("API 키가 삭제되었습니다.");
    await fetchKeys();
    return true;
  }, [fetchKeys]);

  const hasKey = useCallback((provider: string) => {
    return keys.some(k => k.provider === provider && k.is_active);
  }, [keys]);

  return { keys, loading, saveKey, deleteKey, hasKey, refetch: fetchKeys };
}
