import { History } from "lucide-react";
import { StubPage } from "../components/StubPage";

export default function HistoryPage() {
  return (
    <StubPage
      icon={History}
      title="히스토리 / 저장된 결과"
      description="이전 분석·생성 결과를 조회하고 재활용합니다."
    />
  );
}
