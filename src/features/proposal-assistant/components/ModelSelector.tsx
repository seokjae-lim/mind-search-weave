import { useState } from "react";
import { Check, ChevronDown, Sparkles, Zap, Brain, Rocket, Lock, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useUserApiKeys } from "../hooks/useUserApiKeys";
import { Link } from "react-router-dom";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  providerKey: string;
  description: string;
  speed: "fast" | "medium" | "slow";
  quality: "high" | "very-high" | "ultra";
  isLovable: boolean;
}

export const availableModels: AIModel[] = [
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "Google", providerKey: "lovable", description: "빠른 속도와 균형잡힌 성능", speed: "fast", quality: "high", isLovable: true },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", providerKey: "lovable", description: "복잡한 추론과 대용량 컨텍스트", speed: "medium", quality: "ultra", isLovable: true },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", providerKey: "lovable", description: "비용 효율적인 균형 모델", speed: "fast", quality: "high", isLovable: true },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "Google", providerKey: "lovable", description: "차세대 고성능 모델", speed: "medium", quality: "ultra", isLovable: true },
  { id: "openai/gpt-5", name: "GPT-5", provider: "OpenAI", providerKey: "lovable", description: "강력한 추론 능력", speed: "slow", quality: "ultra", isLovable: true },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", providerKey: "lovable", description: "빠른 속도와 좋은 성능", speed: "fast", quality: "very-high", isLovable: true },
  { id: "openai/gpt-5.2", name: "GPT-5.2", provider: "OpenAI", providerKey: "lovable", description: "최신 향상된 추론", speed: "medium", quality: "ultra", isLovable: true },
  { id: "huggingface/qwen2.5-72b", name: "Qwen 2.5 72B", provider: "HuggingFace", providerKey: "huggingface", description: "오픈소스 최강 모델 (무료)", speed: "medium", quality: "ultra", isLovable: false },
  { id: "huggingface/qwen2.5-coder-32b", name: "Qwen 2.5 Coder 32B", provider: "HuggingFace", providerKey: "huggingface", description: "코딩 특화 모델 (무료)", speed: "fast", quality: "very-high", isLovable: false },
  { id: "huggingface/llama-3.3-70b", name: "Llama 3.3 70B", provider: "HuggingFace", providerKey: "huggingface", description: "Meta 최신 오픈소스 (무료)", speed: "medium", quality: "ultra", isLovable: false },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3", provider: "DeepSeek", providerKey: "deepseek", description: "초저가 고성능 모델", speed: "fast", quality: "ultra", isLovable: false },
  { id: "deepseek/deepseek-reasoner", name: "DeepSeek R1", provider: "DeepSeek", providerKey: "deepseek", description: "추론 특화 모델", speed: "slow", quality: "ultra", isLovable: false },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", providerKey: "anthropic", description: "뛰어난 분석력과 안전성", speed: "medium", quality: "ultra", isLovable: false },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic", providerKey: "anthropic", description: "빠른 경량 Claude", speed: "fast", quality: "very-high", isLovable: false },
  { id: "moonshot/kimi", name: "Kimi 128K", provider: "Moonshot", providerKey: "moonshot", description: "긴 컨텍스트 처리 특화", speed: "medium", quality: "high", isLovable: false },
];

export function isLovableModel(modelId: string): boolean {
  return availableModels.find(m => m.id === modelId)?.isLovable ?? false;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

const getSpeedIcon = (speed: AIModel["speed"]) => {
  switch (speed) {
    case "fast": return <Zap className="w-3 h-3 text-yellow-500" />;
    case "medium": return <Sparkles className="w-3 h-3 text-blue-500" />;
    case "slow": return <Brain className="w-3 h-3 text-purple-500" />;
  }
};

const getQualityBadge = (quality: AIModel["quality"]) => {
  switch (quality) {
    case "high": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "very-high": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "ultra": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  }
};

const ModelSelector = ({ selectedModel, onModelChange, disabled = false }: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { hasKey } = useUserApiKeys();
  
  const currentModel = availableModels.find(m => m.id === selectedModel) || availableModels[0];
  
  const lovableModels = availableModels.filter(m => m.isLovable);
  const externalModels = availableModels.filter(m => !m.isLovable);

  const groupedExternal = externalModels.reduce<Record<string, AIModel[]>>((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  const renderModelItem = (model: AIModel, isAvailable: boolean) => (
    <DropdownMenuItem
      key={model.id}
      onClick={() => {
        if (isAvailable) {
          onModelChange(model.id);
          setOpen(false);
        }
      }}
      disabled={!isAvailable}
      className={cn(
        "flex items-start gap-3 py-3 cursor-pointer",
        !isAvailable && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{model.name}</span>
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getQualityBadge(model.quality))}>
            {model.quality === "ultra" ? "ULTRA" : model.quality === "very-high" ? "HIGH" : "GOOD"}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{model.provider}</div>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          {getSpeedIcon(model.speed)}
          <span>{model.speed === "fast" ? "빠름" : model.speed === "medium" ? "보통" : "느림"}</span>
          <span className="mx-1">•</span>
          <span>{model.description}</span>
        </div>
      </div>
      {selectedModel === model.id && <Check className="w-4 h-4 text-primary mt-1" />}
      {!isAvailable && <Lock className="w-4 h-4 text-muted-foreground mt-1" />}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between gap-2 h-auto py-2" disabled={disabled}>
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            <div className="text-left">
              <div className="font-medium text-sm">{currentModel.name}</div>
              <div className="text-xs text-muted-foreground">{currentModel.provider}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-[70vh] overflow-y-auto" align="start">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Lovable AI 기본 모델
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {lovableModels.map(m => renderModelItem(m, true))}
        </DropdownMenuGroup>

        {Object.entries(groupedExternal).map(([providerName, models]) => {
          const providerKey = models[0].providerKey;
          const isConfigured = hasKey(providerKey);

          return (
            <div key={providerName}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {isConfigured ? <Key className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                  {providerName}
                </span>
                {isConfigured ? (
                  <span className="text-[10px] text-primary font-normal">API 키 설정됨</span>
                ) : (
                  <Link to="/assistant/settings" className="text-[10px] text-muted-foreground hover:text-primary font-normal" onClick={() => setOpen(false)}>
                    키 설정 →
                  </Link>
                )}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {models.map(m => renderModelItem(m, isConfigured))}
              </DropdownMenuGroup>
            </div>
          );
        })}

        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <Link to="/assistant/settings" onClick={() => setOpen(false)}>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Key className="w-3.5 h-3.5" />
              API 키 관리
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ModelSelector;
