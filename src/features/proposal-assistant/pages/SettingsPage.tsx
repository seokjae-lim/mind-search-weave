import { useState } from "react";
import { Key, ExternalLink, Trash2, Eye, EyeOff, Check, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserApiKeys, providerInfo } from "../hooks/useUserApiKeys";
import { useAuth } from "../hooks/useAuth";

export default function SettingsPage() {
  const { user } = useAuth();
  const { keys, loading, saveKey, deleteKey, hasKey } = useUserApiKeys();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async (provider: string) => {
    const value = inputValues[provider]?.trim();
    if (!value) return;
    setSaving(true);
    const ok = await saveKey(provider, value);
    if (ok) {
      setEditingProvider(null);
      setInputValues(prev => ({ ...prev, [provider]: "" }));
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <SettingsIcon className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
        <p className="text-muted-foreground">API 키를 관리하려면 먼저 로그인해주세요.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="w-6 h-6 text-primary" />
          외부 AI 모델 API 키 관리
        </h1>
        <p className="text-muted-foreground mt-1">
          외부 AI 프로바이더의 API 키를 입력하면 해당 모델을 사용할 수 있습니다. 키는 암호화되어 안전하게 저장됩니다.
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(providerInfo).map(([providerId, info]) => {
          const isConfigured = hasKey(providerId);
          const isEditing = editingProvider === providerId;

          return (
            <Card key={providerId} className={isConfigured ? "border-primary/30" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {info.name}
                      {isConfigured && (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                          <Check className="w-3 h-3 mr-1" />
                          설정됨
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">{info.description}</CardDescription>
                  </div>
                  <a
                    href={info.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    API 키 발급
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKey[providerId] ? "text" : "password"}
                        placeholder={info.placeholder}
                        value={inputValues[providerId] || ""}
                        onChange={(e) => setInputValues(prev => ({ ...prev, [providerId]: e.target.value }))}
                        className="pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowKey(prev => ({ ...prev, [providerId]: !prev[providerId] }))}
                      >
                        {showKey[providerId] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <Button onClick={() => handleSave(providerId)} disabled={saving || !inputValues[providerId]?.trim()}>
                      저장
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingProvider(null)}>
                      취소
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProvider(providerId)}
                    >
                      {isConfigured ? "키 변경" : "API 키 입력"}
                    </Button>
                    {isConfigured && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteKey(providerId)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        삭제
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">💡 무료 모델 사용 팁</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>HuggingFace</strong>: 무료 계정으로 Qwen, Llama, Mistral 등 오픈소스 모델을 무료로 사용할 수 있습니다. (월간 사용량 제한 있음)</p>
          <p>• <strong>DeepSeek</strong>: 가입 시 무료 크레딧이 제공되며, DeepSeek-V3는 매우 저렴합니다.</p>
          <p>• <strong>OpenRouter</strong>: 여러 무료/저렴한 모델을 하나의 API로 접근할 수 있습니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
