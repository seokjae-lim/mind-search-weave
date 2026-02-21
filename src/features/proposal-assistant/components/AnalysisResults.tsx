import { forwardRef } from "react";
import StepCard from "./StepCard";
import StepProgress from "./StepProgress";
import { StepAnalysisData } from "../contexts/AnalysisContext";
import { Loader2 } from "lucide-react";

interface AnalysisResultsProps {
  rfpContent: string;
  currentStep: number;
  analysisResults?: Record<number, StepAnalysisData>;
  isAnalyzing?: boolean;
  currentAnalyzingStep?: number | null;
  onReanalyzeStep?: (step: number, customPrompt?: string) => void;
}

type StepStatus = "pending" | "processing" | "completed";

const AnalysisResults = forwardRef<HTMLDivElement, AnalysisResultsProps>(({ 
  rfpContent, currentStep, analysisResults = {}, isAnalyzing = false, currentAnalyzingStep = null, onReanalyzeStep
}, ref) => {
  const getStatus = (stepNum: number): StepStatus => {
    const result = analysisResults[stepNum];
    if (result?.loading) return "processing";
    if (result?.data && Object.keys(result.data).length > 0) return "completed";
    if (currentAnalyzingStep && stepNum < currentAnalyzingStep) return "completed";
    if (currentAnalyzingStep === stepNum) return "processing";
    return "pending";
  };

  const steps = [
    { number: 1, title: "사업 본질", status: getStatus(1) },
    { number: 2, title: "현황 분석", status: getStatus(2) },
    { number: 3, title: "대안 시나리오", status: getStatus(3) },
    { number: 4, title: "타당성 분석", status: getStatus(4) },
    { number: 5, title: "아키텍처", status: getStatus(5) },
    { number: 6, title: "관리·위험", status: getStatus(6) },
  ];

  const stepMeta = [
    { title: "STEP 1. 사업 본질 재정의", description: "ISP·ISMP 공통가이드 제9판 기반 사업 타당성 검토" },
    { title: "STEP 2. 현황 분석", description: "환경·현황 분석 및 이슈 도출" },
    { title: "STEP 3. 대안 시나리오 도출", description: "최소 3개 시나리오 비교 분석" },
    { title: "STEP 4. 타당성 분석", description: "사업/기술/운영 타당성 분석" },
    { title: "STEP 5. 개념 아키텍처 및 로드맵", description: "시범→검증→확산 구조 및 총구축비 산출" },
    { title: "STEP 6. 사업 관리·위험·확산", description: "AI·데이터 리스크 대응 및 확산 전략" },
  ];

  const renderStepContent = (stepNum: number) => {
    const result = analysisResults[stepNum];
    if (!result) return <div className="text-center py-8 text-muted-foreground">분석 대기 중...</div>;
    if (result.loading) return <div className="flex items-center justify-center gap-3 py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /><span className="text-muted-foreground">AI가 RFP를 분석하고 있습니다...</span></div>;
    if (result.error) return <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800"><p className="text-red-700 dark:text-red-400">분석 오류: {result.error}</p></div>;

    const data = result.data;
    switch (stepNum) {
      case 1: return <Step1Content data={data} rfpContent={rfpContent} />;
      case 2: return <Step2Content data={data} />;
      case 3: return <Step3Content data={data} />;
      case 4: return <Step4Content data={data} />;
      case 5: return <Step5Content data={data} />;
      case 6: return <Step6Content data={data} />;
      default: return null;
    }
  };

  const hasStepResult = (stepNum: number) => {
    const result = analysisResults[stepNum];
    return result?.loading || result?.error || (result?.data && Object.keys(result.data).length > 0);
  };

  return (
    <div ref={ref} className="space-y-4">
      <StepProgress steps={steps} />
      {stepMeta.map((step, index) => {
        const stepNum = index + 1;
        if (!hasStepResult(stepNum) && currentAnalyzingStep !== stepNum) return null;
        const result = analysisResults[stepNum];
        const isCompleted = result?.data && Object.keys(result.data).length > 0 && !result.loading;
        const latestHistory = result?.history?.[result.history.length - 1];
        const improvements = latestHistory?.strengths || latestHistory?.weaknesses ? { strengths: latestHistory.strengths, weaknesses: latestHistory.weaknesses } : undefined;

        return (
          <StepCard key={stepNum} stepNumber={stepNum} title={step.title} description={step.description} content={renderStepContent(stepNum)} isActive={currentAnalyzingStep === stepNum} isLoading={result?.loading} onReanalyze={isCompleted && onReanalyzeStep ? (cp?: string) => onReanalyzeStep(stepNum, cp) : undefined} currentVersion={result?.currentVersion} history={result?.history} improvements={improvements} currentData={result?.data} />
        );
      })}
    </div>
  );
});

AnalysisResults.displayName = "AnalysisResults";

// Step content components
const Step1Content = ({ data, rfpContent }: { data: Record<string, unknown>; rfpContent: string }) => {
  const surfacePurpose = (data.surfacePurpose as string[]) || [];
  const realProblems = (data.realProblems as string[]) || [];
  const necessity = data.necessity as { problems?: string[]; improvements?: string[] } || {};
  const urgency = (data.urgency as string[]) || [];
  const policyLinks = (data.policyLinks as Array<{ category: string; basis: string; content: string }>) || [];
  const risks = data.risks as { administrative?: string[]; management?: string[]; operational?: string[] } || {};

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">1.1 표면적 사업 목적 vs 실제 해결 과제</h3>
        <div className="bg-muted/30 p-4 rounded-lg mb-3"><p className="text-sm text-muted-foreground"><strong>분석된 RFP 내용:</strong> {rfpContent.length.toLocaleString()}자</p></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg"><h4 className="font-medium text-sm mb-2 text-primary">▶ 표면적 목적</h4><ul className="text-sm space-y-1 text-muted-foreground">{surfacePurpose.map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          <div className="bg-muted/50 p-4 rounded-lg"><h4 className="font-medium text-sm mb-2 text-primary">▶ 실제 해결 과제</h4><ul className="text-sm space-y-1 text-muted-foreground">{realProblems.map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">1.2 필요성 분석</h3>
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border-l-4 border-blue-500"><h4 className="font-medium text-sm mb-2">현행 문제점</h4><ul className="text-sm space-y-1 text-muted-foreground">{(necessity.problems || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border-l-4 border-blue-500"><h4 className="font-medium text-sm mb-2">개선 사유</h4><ul className="text-sm space-y-1 text-muted-foreground">{(necessity.improvements || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">1.3 시급성 분석</h3>
        <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border-l-4 border-amber-500"><ul className="text-sm space-y-1 text-muted-foreground">{urgency.map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
      </div>
      {policyLinks.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">1.4 상위 정책 연계</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-muted"><th className="border border-border p-3 text-left">구분</th><th className="border border-border p-3 text-left">근거</th><th className="border border-border p-3 text-left">연계 내용</th></tr></thead><tbody>{policyLinks.map((link, i) => <tr key={i}><td className="border border-border p-3 font-medium">{link.category}</td><td className="border border-border p-3">{link.basis}</td><td className="border border-border p-3">{link.content}</td></tr>)}</tbody></table></div>
        </div>
      )}
      <div>
        <h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">1.5 리스크</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800"><h4 className="font-medium text-sm mb-2 text-red-700 dark:text-red-400">행정</h4><ul className="text-xs space-y-1 text-muted-foreground">{(risks.administrative || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-800"><h4 className="font-medium text-sm mb-2 text-orange-700 dark:text-orange-400">관리</h4><ul className="text-xs space-y-1 text-muted-foreground">{(risks.management || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800"><h4 className="font-medium text-sm mb-2 text-yellow-700 dark:text-yellow-400">운영</h4><ul className="text-xs space-y-1 text-muted-foreground">{(risks.operational || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
        </div>
      </div>
    </div>
  );
};

const Step2Content = ({ data }: { data: Record<string, unknown> }) => {
  const canDo = (data.canDo as string[]) || [];
  const cannotDo = (data.cannotDo as string[]) || [];
  const needsPreparation = (data.needsPreparation as string[]) || [];
  const duplication = data.duplication as { internalSystems?: string[]; externalSystems?: string[]; integrationPlan?: string } || {};
  const constraints = (data.constraints as Array<{ category: string; current: string; constraint: string; direction: string }>) || [];

  return (
    <div className="space-y-6">
      <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">2.1 역량 및 제약 분석</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800"><h4 className="font-medium text-sm mb-2 text-green-700 dark:text-green-400">✓ 할 수 있는 것</h4><ul className="text-xs space-y-1 text-muted-foreground">{canDo.map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800"><h4 className="font-medium text-sm mb-2 text-red-700 dark:text-red-400">✗ 하면 안 되는 것</h4><ul className="text-xs space-y-1 text-muted-foreground">{cannotDo.map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800"><h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-400">◐ 준비 필요</h4><ul className="text-xs space-y-1 text-muted-foreground">{needsPreparation.map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
        </div>
      </div>
      <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">2.2 중복성 검토</h3>
        <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border-l-4 border-purple-500">
          <div className="grid md:grid-cols-2 gap-4 mb-3">
            <div><h4 className="font-medium text-sm mb-2">내부 유사 시스템</h4><ul className="text-sm space-y-1 text-muted-foreground">{(duplication.internalSystems || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
            <div><h4 className="font-medium text-sm mb-2">외부 연계 시스템</h4><ul className="text-sm space-y-1 text-muted-foreground">{(duplication.externalSystems || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          </div>
          {duplication.integrationPlan && <div className="bg-white dark:bg-background p-3 rounded border"><p className="text-sm text-muted-foreground"><strong>통합/연계 결과:</strong> {duplication.integrationPlan}</p></div>}
        </div>
      </div>
      {constraints.length > 0 && (
        <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">2.3 제약 분석</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-muted"><th className="border border-border p-3 text-left">구분</th><th className="border border-border p-3 text-left">현황</th><th className="border border-border p-3 text-left">제약</th><th className="border border-border p-3 text-left">개선 방향</th></tr></thead><tbody>{constraints.map((c, i) => <tr key={i}><td className="border border-border p-3 font-medium">{c.category}</td><td className="border border-border p-3">{c.current}</td><td className="border border-border p-3">{c.constraint}</td><td className="border border-border p-3">{c.direction}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  );
};

const Step3Content = ({ data }: { data: Record<string, unknown> }) => {
  const scenarios = (data.scenarios as Array<{ name: string; overview: string; pros: string[]; cons: string[]; prerequisites: string[]; cloudApproach: string; duration: string }>) || [];
  const cloudReview = data.cloudReview as { priority?: string; recommendation?: string; reason?: string } || {};
  const recommendation = data.recommendation as { scenario?: string; reasons?: string[] } || {};

  return (
    <div className="space-y-6">
      {scenarios.length > 0 && (
        <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">3.1 대안 시나리오 비교</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-muted"><th className="border border-border p-3 text-left">구분</th>{scenarios.map((s, i) => <th key={i} className="border border-border p-3 text-left">{s.name}</th>)}</tr></thead><tbody>
            <tr><td className="border border-border p-3 font-medium">개요</td>{scenarios.map((s, i) => <td key={i} className="border border-border p-3">{s.overview}</td>)}</tr>
            <tr><td className="border border-border p-3 font-medium">장점</td>{scenarios.map((s, i) => <td key={i} className="border border-border p-3">{s.pros?.join(", ")}</td>)}</tr>
            <tr><td className="border border-border p-3 font-medium">한계</td>{scenarios.map((s, i) => <td key={i} className="border border-border p-3">{s.cons?.join(", ")}</td>)}</tr>
            <tr><td className="border border-border p-3 font-medium">클라우드</td>{scenarios.map((s, i) => <td key={i} className="border border-border p-3">{s.cloudApproach}</td>)}</tr>
            <tr><td className="border border-border p-3 font-medium">기간</td>{scenarios.map((s, i) => <td key={i} className="border border-border p-3">{s.duration}</td>)}</tr>
          </tbody></table></div>
        </div>
      )}
      {cloudReview.recommendation && (
        <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">3.2 클라우드 우선 적용</h3>
          <div className="bg-cyan-50 dark:bg-cyan-950/30 p-4 rounded-lg border-l-4 border-cyan-500"><p className="text-sm mb-2"><strong>권장:</strong> {cloudReview.recommendation}</p><p className="text-sm text-muted-foreground"><strong>근거:</strong> {cloudReview.reason}</p></div>
        </div>
      )}
      {recommendation.scenario && (
        <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">3.3 권장 시나리오</h3>
          <div className="bg-primary/5 p-4 rounded-lg border-2 border-primary"><div className="flex items-center gap-2 mb-3"><span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">권장</span><span className="font-semibold">{recommendation.scenario}</span></div><ul className="text-sm space-y-1 text-muted-foreground">{(recommendation.reasons || []).map((r, i) => <li key={i}>• {r}</li>)}</ul></div>
        </div>
      )}
    </div>
  );
};

const Step4Content = ({ data }: { data: Record<string, unknown> }) => {
  const bv = data.businessValidity as { necessity?: string[]; urgency?: string[]; duplication?: string[] } || {};
  const f = data.feasibility as { projectConditions?: { organization?: string; cooperation?: string; legal?: string }; technicalValidity?: { essential?: string; cases?: string[] } } || {};
  const cp = data.cloudPriority as { analysis?: string; nativeApproach?: string } || {};
  const sv = data.scaleValidity as { costBasis?: string[]; capacityBasis?: string[] } || {};

  return (
    <div className="space-y-6">
      <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">4.1 사업 타당성</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800"><h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-400">필요성</h4><ul className="text-xs space-y-1 text-muted-foreground">{(bv.necessity || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800"><h4 className="font-medium text-sm mb-2 text-amber-700 dark:text-amber-400">시급성</h4><ul className="text-xs space-y-1 text-muted-foreground">{(bv.urgency || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800"><h4 className="font-medium text-sm mb-2 text-purple-700 dark:text-purple-400">중복성</h4><ul className="text-xs space-y-1 text-muted-foreground">{(bv.duplication || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
        </div>
      </div>
      {f.projectConditions && <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">4.2 실현 가능성</h3><div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border-l-4 border-green-500"><ul className="text-sm space-y-1 text-muted-foreground"><li>• <strong>조직:</strong> {f.projectConditions.organization}</li><li>• <strong>협조:</strong> {f.projectConditions.cooperation}</li><li>• <strong>법제도:</strong> {f.projectConditions.legal}</li></ul></div></div>}
      {cp.analysis && <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">4.3 클라우드 우선 적용</h3><div className="bg-cyan-50 dark:bg-cyan-950/30 p-4 rounded-lg"><p className="text-sm text-muted-foreground">{cp.analysis}</p></div></div>}
      <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">4.4 규모 적정성</h3><div className="grid md:grid-cols-2 gap-4"><div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border-l-4 border-orange-500"><h4 className="font-medium text-sm mb-2">비용 산출 근거</h4><ul className="text-sm space-y-1 text-muted-foreground">{(sv.costBasis || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div><div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border-l-4 border-orange-500"><h4 className="font-medium text-sm mb-2">용량 산정 근거</h4><ul className="text-sm space-y-1 text-muted-foreground">{(sv.capacityBasis || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div></div></div>
    </div>
  );
};

const Step5Content = ({ data }: { data: Record<string, unknown> }) => {
  const arch = data.architecture as { userLayer?: string; serviceLayer?: string; platformLayer?: string; infraLayer?: string } || {};
  const roadmap = (data.roadmap as Array<{ phase: number; name: string; duration: string; description: string; outputs: string[]; decisions: string[] }>) || [];

  return (
    <div className="space-y-6">
      <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">5.1 To-Be 아키텍처</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg"><h4 className="font-medium text-sm mb-2">사용자 계층</h4><p className="text-sm text-muted-foreground">{arch.userLayer}</p></div>
          <div className="bg-muted/50 p-4 rounded-lg"><h4 className="font-medium text-sm mb-2">서비스 계층</h4><p className="text-sm text-muted-foreground">{arch.serviceLayer}</p></div>
          <div className="bg-muted/50 p-4 rounded-lg"><h4 className="font-medium text-sm mb-2">플랫폼 계층</h4><p className="text-sm text-muted-foreground">{arch.platformLayer}</p></div>
          <div className="bg-muted/50 p-4 rounded-lg"><h4 className="font-medium text-sm mb-2">인프라 계층</h4><p className="text-sm text-muted-foreground">{arch.infraLayer}</p></div>
        </div>
      </div>
      {roadmap.length > 0 && (
        <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">5.2 단계별 로드맵</h3>
          <div className="space-y-4">{roadmap.map((phase, i) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">{phase.phase}</span>
              <div className="flex-1"><h4 className="font-semibold text-foreground">{phase.name} ({phase.duration})</h4><p className="text-sm text-muted-foreground mt-1">{phase.description}</p><div className="mt-2 grid md:grid-cols-2 gap-2 text-xs"><div className="bg-card p-2 rounded"><strong>산출물:</strong> {phase.outputs?.join(", ")}</div><div className="bg-card p-2 rounded"><strong>의사결정:</strong> {phase.decisions?.join(", ")}</div></div></div>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
};

const Step6Content = ({ data }: { data: Record<string, unknown> }) => {
  const aiDataRisks = (data.aiDataRisks as Array<{ type: string; description: string; response: string; priority: string }>) || [];
  const policyResponse = data.policyResponse as { legal?: string[]; security?: string[]; policy?: string[] } || {};
  const projectManagement = data.projectManagement as { organization?: { client?: string; contractor?: string; audit?: string }; quality?: string[] } || {};
  const expansionStrategy = data.expansionStrategy as { reusability?: string[]; expansion?: string[] } || {};
  const expectedEffects = data.expectedEffects as { quantitative?: Array<{ item: string; value: string }>; qualitative?: string[] } || {};

  return (
    <div className="space-y-6">
      {aiDataRisks.length > 0 && (
        <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">6.1 AI·데이터 리스크</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-muted"><th className="border border-border p-3 text-left">유형</th><th className="border border-border p-3 text-left">설명</th><th className="border border-border p-3 text-left">대응</th><th className="border border-border p-3 text-center">우선순위</th></tr></thead><tbody>{aiDataRisks.map((risk, i) => <tr key={i}><td className="border border-border p-3 font-medium">{risk.type}</td><td className="border border-border p-3">{risk.description}</td><td className="border border-border p-3">{risk.response}</td><td className="border border-border p-3 text-center"><span className={`px-2 py-1 rounded text-xs ${risk.priority === "상" ? "bg-red-100 text-red-700" : risk.priority === "중" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>{risk.priority}</span></td></tr>)}</tbody></table></div>
        </div>
      )}
      <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">6.2 정책·보안 대응</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800"><h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-400">법·제도</h4><ul className="text-xs space-y-1 text-muted-foreground">{(policyResponse.legal || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800"><h4 className="font-medium text-sm mb-2 text-green-700 dark:text-green-400">보안</h4><ul className="text-xs space-y-1 text-muted-foreground">{(policyResponse.security || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
          <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800"><h4 className="font-medium text-sm mb-2 text-purple-700 dark:text-purple-400">정책</h4><ul className="text-xs space-y-1 text-muted-foreground">{(policyResponse.policy || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div>
        </div>
      </div>
      {projectManagement.organization && <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">6.3 사업 관리 체계</h3><div className="bg-muted/50 p-4 rounded-lg"><ul className="text-sm space-y-1 text-muted-foreground"><li>• <strong>발주기관:</strong> {projectManagement.organization.client}</li><li>• <strong>수행기관:</strong> {projectManagement.organization.contractor}</li><li>• <strong>감리기관:</strong> {projectManagement.organization.audit}</li></ul></div></div>}
      <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">6.4 확산 전략</h3><div className="space-y-3"><div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border-l-4 border-amber-500"><h4 className="font-medium text-sm mb-2">재사용성</h4><ul className="text-sm space-y-1 text-muted-foreground">{(expansionStrategy.reusability || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div><div className="bg-teal-50 dark:bg-teal-950/30 p-4 rounded-lg border-l-4 border-teal-500"><h4 className="font-medium text-sm mb-2">확산 방안</h4><ul className="text-sm space-y-1 text-muted-foreground">{(expansionStrategy.expansion || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div></div></div>
      <div><h3 className="font-semibold text-foreground border-b border-border pb-2 mb-3">6.5 기대효과</h3><div className="grid md:grid-cols-2 gap-4"><div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800"><h4 className="font-medium text-sm mb-2 text-green-700 dark:text-green-400">정량적</h4><ul className="text-xs space-y-1 text-muted-foreground">{(expectedEffects.quantitative || []).map((item, i) => <li key={i}>• <strong>{item.item}:</strong> {item.value}</li>)}</ul></div><div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800"><h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-400">정성적</h4><ul className="text-xs space-y-1 text-muted-foreground">{(expectedEffects.qualitative || []).map((item, i) => <li key={i}>• {item}</li>)}</ul></div></div></div>
    </div>
  );
};

export default AnalysisResults;
