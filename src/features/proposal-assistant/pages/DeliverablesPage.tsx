import { FileText } from "lucide-react";
import { StubPage } from "../components/StubPage";

export default function DeliverablesPage() {
  return (
    <StubPage
      icon={FileText}
      title="산출물 생성"
      description="보고서·PPT·요약본 등 산출물을 자동으로 작성합니다."
    />
  );
}
