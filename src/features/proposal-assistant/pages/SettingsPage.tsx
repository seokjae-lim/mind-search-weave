import { Settings } from "lucide-react";
import { StubPage } from "../components/StubPage";

export default function SettingsPage() {
  return (
    <StubPage
      icon={Settings}
      title="어시스턴트 설정"
      description="API 키 관리, 모델 설정, 연동 도구 구성을 관리합니다."
    />
  );
}
