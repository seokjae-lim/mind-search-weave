import { FilePlus } from "lucide-react";
import { StubPage } from "../components/StubPage";

export default function ProposalPage() {
  return (
    <StubPage
      icon={FilePlus}
      title="제안서 초안 생성"
      description="분석된 요구사항을 기반으로 제안서 초안을 자동 생성합니다."
    />
  );
}
