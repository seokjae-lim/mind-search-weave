import {
  Search,
  FileSearch,
  FilePlus,
  BookOpen,
  FileText,
  History,
  ExternalLink,
  GraduationCap,
  Pen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  route?: string;          // internal route
  externalUrl?: string;     // external link (new tab)
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
    description: "제안요청서를 업로드하면 핵심 요구사항을 자동으로 추출합니다.",
    icon: FileSearch,
    route: "/assistant/analysis",
    category: "internal",
  },
  {
    id: "proposal-draft",
    title: "제안서 초안 생성",
    description: "분석된 요구사항을 기반으로 제안서 초안을 자동 생성합니다.",
    icon: FilePlus,
    route: "/assistant/proposal",
    category: "internal",
  },
  {
    id: "deep-research",
    title: "요구사항별 자료조사",
    description: "요구사항별 딥리서치를 수행하여 근거 자료를 수집합니다.",
    icon: BookOpen,
    route: "/assistant/research",
    category: "internal",
  },
  {
    id: "deliverables",
    title: "산출물 생성",
    description: "보고서·PPT·요약본 등 산출물을 자동으로 작성합니다.",
    icon: FileText,
    route: "/assistant/deliverables",
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
