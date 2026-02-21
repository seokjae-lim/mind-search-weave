import { FileSearch } from "lucide-react";
import { StubPage } from "../components/StubPage";

export default function AnalysisPage() {
  return (
    <StubPage
      icon={FileSearch}
      title="RFP / 요구사항 분석"
      description="제안요청서(RFP)를 업로드하면 핵심 요구사항을 자동으로 추출·분류합니다."
    />
  );
}
