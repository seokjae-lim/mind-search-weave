import {
  Search,
  FileSearch,
  Workflow,
  BookOpen,
  FileText,
  History,
  ExternalLink,
  GraduationCap,
  Pen,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  route?: string;
  externalUrl?: string;
  category: "internal" | "external";
}

/** 내부 기능 — 라우트로 이동 */
export const internalActions: QuickAction[] = [
  {
    id: "wiki-search",
    title: "내부 산출물 검색",
    description: "축적된 컨설팅 산출물을 키워드·의미 기반으로 검색합니다.",
    icon: Search,
    route: "/",
    category: "internal",
  },
  {
    id: "rfp-analysis",
    title: "RFP / 요구사항 분석",
    description: "제안요청서를 업로드하면 6단계 심층 분석을 자동으로 수행합니다.",
    icon: FileSearch,
    route: "/assistant/analysis",
    category: "internal",
  },
  {
    id: "proposal-workflow",
    title: "통합 제안서 워크플로우",
    description: "요구사항 추출 → 5단계 딥리서치 → 제안서 초안 → 통합 문서를 한 곳에서 관리합니다.",
    icon: Workflow,
    route: "/assistant/workflow",
    category: "internal",
  },
  {
    id: "history",
    title: "히스토리 / 저장된 결과",
    description: "이전 분석·생성 결과를 조회하고 재활용합니다.",
    icon: History,
    route: "/assistant/history",
    category: "internal",
  },
  {
    id: "settings",
    title: "AI 모델 설정",
    description: "외부 AI 모델 API 키를 관리합니다.",
    icon: Settings,
    route: "/assistant/settings",
    category: "internal",
  },
];

/** 외부 도구 — 새 탭으로 열기 */
export const externalTools: QuickAction[] = [
  {
    id: "dbpia",
    title: "DBpia 논문 검색",
    description: "국내 학술논문 데이터베이스에서 검색합니다.",
    icon: GraduationCap,
    externalUrl: "https://www.dbpia.co.kr/search/topSearch?query=",
    category: "external",
  },
  {
    id: "liner-scholar",
    title: "Liner Scholar",
    description: "AI 기반 학술 논문 검색 및 요약 서비스입니다.",
    icon: BookOpen,
    externalUrl: "https://scholar.liner.com/ko",
    category: "external",
  },
  {
    id: "liner-write",
    title: "Liner Write",
    description: "AI 기반 문서 작성 도우미입니다.",
    icon: Pen,
    externalUrl: "https://write.liner.com/ko",
    category: "external",
  },
  {
    id: "genspark",
    title: "Genspark",
    description: "AI 기반 딥리서치 및 보고서 생성 도구입니다.",
    icon: Sparkles,
    externalUrl: "https://www.genspark.ai/search?q=",
    category: "external",
  },
];
