import { useState, useEffect } from "react";
import { Upload, FileText, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirementsList } from "../components/RequirementsList";
import { DeliverablePanel } from "../components/DeliverablePanel";
import ModelSelector from "../components/ModelSelector";
import AuthModal from "../components/AuthModal";
import { useRequirements, Requirement } from "../hooks/useRequirements";
import { useAuth } from "../hooks/useAuth";
import { parseFile, ParseResult } from "../lib/fileParser";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function DeliverablesPage() {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [rfpContent, setRfpContent] = useState("");
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [activeTab, setActiveTab] = useState<"input" | "manage">("input");

  const {
    requirements,
    deliverables,
    isExtracting,
    isGenerating,
    selectedModel,
    setSelectedModel,
    extractRequirements,
    addRequirement,
    updateRequirement,
    removeRequirement,
    generateDeliverable,
    saveRequirementsToDb,
    loadRequirementsFromDb,
    resetAll,
  } = useRequirements();

  useEffect(() => {
    if (user) {
      loadRequirementsFromDb(user.id);
    }
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result: ParseResult = await parseFile(file);
      if (result.success) {
        setRfpContent(result.content);
        toast.success("파일이 업로드되었습니다.");
      } else {
        toast.error(result.error || "파일 파싱 중 오류가 발생했습니다.");
      }
    } catch {
      toast.error("파일 파싱 중 오류가 발생했습니다.");
    }
  };

  const handleExtract = async () => {
    if (!rfpContent.trim()) {
      toast.error("RFP 내용을 입력해주세요.");
      return;
    }

    const extracted = await extractRequirements(rfpContent);
    if (extracted.length > 0) {
      setActiveTab("manage");
      setSelectedRequirement(extracted[0]);
    }
  };

  const handleGenerate = async (type: string) => {
    if (!selectedRequirement) return;
    await generateDeliverable(selectedRequirement, type);
  };

  const handleSignUp = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("회원가입이 완료되었습니다.");
    return true;
  };

  const handleSignIn = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("로그인되었습니다.");
    return true;
  };

  const handleSave = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    await saveRequirementsToDb(user.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">요구사항 & 산출물 관리</h1>
          <p className="text-muted-foreground">
            RFP/CNR에서 요구사항을 추출하고 산출물을 생성합니다
          </p>
        </div>
        <Button variant="outline" onClick={handleSave} disabled={requirements.length === 0}>
          <Save className="w-4 h-4 mr-2" />
          저장
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "input" | "manage")}>
        <TabsList className="mb-4">
          <TabsTrigger value="input" className="gap-2">
            <Upload className="w-4 h-4" />
            RFP 입력
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <FileText className="w-4 h-4" />
            요구사항 관리
            {requirements.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {requirements.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    RFP/CNR 문서 입력
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <label className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        파일 업로드
                        <input
                          type="file"
                          className="hidden"
                          accept=".txt,.pdf,.doc,.docx,.hwp"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRfpContent("");
                        resetAll();
                      }}
                      disabled={!rfpContent}
                    >
                      초기화
                    </Button>
                  </div>
                  <Textarea
                    placeholder="RFP 또는 CNR 문서 내용을 붙여넣으세요..."
                    value={rfpContent}
                    onChange={(e) => setRfpContent(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleExtract}
                    disabled={isExtracting || !rfpContent.trim()}
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        요구사항 추출 중...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        요구사항 자동 추출
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>AI 모델 설정</CardTitle>
                </CardHeader>
                <CardContent>
                  <ModelSelector
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-280px)]">
            <RequirementsList
              requirements={requirements}
              selectedRequirement={selectedRequirement}
              onSelect={setSelectedRequirement}
              onAdd={addRequirement}
              onUpdate={updateRequirement}
              onRemove={removeRequirement}
            />
            <DeliverablePanel
              requirement={selectedRequirement}
              deliverables={selectedRequirement ? deliverables[selectedRequirement.requirement_number] || [] : []}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
            />
          </div>
        </TabsContent>
      </Tabs>

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSignUp={handleSignUp}
        onSignIn={handleSignIn}
      />
    </div>
  );
}
