

# Knowledge Wiki 고도화 - DBpia 벤치마킹 종합 플랜

## 현재 상태
- 기본 검색 UI (홈 + 결과 페이지) 구현 완료
- Mock 데이터 기반 검색, 파일 탐색, 대시보드 존재
- 사이드바 네비게이션 구조

## 목표
DBpia의 주요 기능을 벤치마킹하여 내부 산출물 검색 + AI 기반 지식 플랫폼으로 고도화

---

## Phase 1: 검색 기능 고도화 (우선순위)

### 1-1. 고급 검색 (상세 검색)
- DBpia의 상세검색처럼 AND/OR/NOT 검색식 지원
- 검색 대상 필드 선택 (문서명, 프로젝트명, 태그 등)
- 날짜 범위 필터 추가
- `/search/advanced` 라우트 추가

### 1-2. 검색 결과 페이지 개선
- DBpia처럼 검색 결과에 AI 요약 스니펫 표시 영역 추가
- 결과 내 재검색 기능
- 페이지네이션 (현재는 전체 로드)
- 관련 키워드 추천 영역

### 1-3. 문서 상세 페이지 강화
- DBpia 논문 상세페이지처럼 메타데이터 풍부하게 표시
- 관련 문서 추천 섹션
- 이용수/조회 통계 표시

---

## Phase 2: AI 챗봇 / AI 검색

### 2-1. AI 검색 (DBpia AI 검색 벤치마킹)
- 검색 결과 페이지 하단에 플로팅 AI 검색 버튼
- 질문하면 내부 축적 데이터 기반으로 답변 + 참고문헌 제공
- Lovable Cloud + Lovable AI (Gemini) 연동
- Edge Function으로 RAG 파이프라인 구현

### 2-2. AI 에이전트 (대화형)
- `/ai-agent` 라우트에 대화형 채팅 UI
- 스트리밍 응답 지원
- 논문 추천, 키워드 분석, 요약 등 멀티 기능
- 사이드바에 "AI Agent" 메뉴 추가

### 2-3. AI 요약 / AI 뷰어
- 문서 상세 페이지에서 "AI 요약" 버튼
- 청크 텍스트를 AI에 전달하여 요약 생성
- AI 채팅으로 문서 내용에 대해 질문 가능

---

## Phase 3: 시각화

### 3-1. 워드 클라우드 / 워드 그래프
- `/visualization/wordcloud` 라우트
- 프로젝트별/전체 키워드 빈도 시각화
- D3.js 기반 인터랙티브 워드 클라우드
- 키워드 클릭시 해당 검색 결과로 이동

### 3-2. 온톨로지 지식 그래프
- `/visualization/knowledge-graph` 라우트
- react-force-graph 또는 D3 force layout 사용
- 노드: 문서, 키워드, 프로젝트, 태그
- 엣지: 문서-키워드, 문서-프로젝트, 키워드-키워드 관계
- 노드 클릭시 상세 정보 패널 표시
- 줌/팬/필터 인터랙션

---

## Phase 4: 추가 기능

### 4-1. AI 아이디어 (DBpia AI 아이디어 벤치마킹)
- 키워드 입력시 관련 주제 추천
- 목차 초안 생성
- 참고 자료 추천

### 4-2. Graph RAG
- 지식 그래프 기반 검색 증강 생성
- AI 답변시 관련 문서간 관계를 그래프로 시각화

---

## 기술 구현 상세

### 새로 추가되는 파일들

| 파일 | 설명 |
|------|------|
| `src/pages/AIAgent.tsx` | AI 에이전트 채팅 페이지 |
| `src/pages/AdvancedSearch.tsx` | 고급 검색 페이지 |
| `src/pages/WordCloud.tsx` | 워드 클라우드 시각화 |
| `src/pages/KnowledgeGraph.tsx` | 지식 그래프 시각화 |
| `src/pages/AIIdea.tsx` | AI 아이디어 페이지 |
| `src/components/AIChatPanel.tsx` | AI 채팅 플로팅 패널 |
| `src/components/AISummary.tsx` | AI 요약 컴포넌트 |
| `src/components/WordCloudChart.tsx` | D3 워드 클라우드 |
| `src/components/ForceGraph.tsx` | 지식 그래프 시각화 |

### 수정되는 파일들

| 파일 | 변경 내용 |
|------|----------|
| `src/App.tsx` | 새 라우트 추가 (/ai-agent, /advanced-search, /visualization/*) |
| `src/components/AppSidebar.tsx` | AI Agent, 시각화 메뉴 추가 |
| `src/components/SearchResults.tsx` | AI 검색 플로팅 버튼, 결과 내 재검색 |
| `src/pages/DocumentDetail.tsx` | AI 요약/채팅 버튼 추가 |
| `src/lib/types.ts` | 그래프 노드/엣지 타입, AI 메시지 타입 추가 |
| `src/lib/mock-data.ts` | 그래프/워드 클라우드 Mock 데이터 |
| `src/lib/api.ts` | AI 관련 API 함수 추가 |

### 필요한 라이브러리
- `d3` + `d3-cloud` - 워드 클라우드
- `react-force-graph-2d` - 지식 그래프
- `react-markdown` - AI 응답 렌더링

### 백엔드 (Lovable Cloud 연동시)
- Edge Function: `ai-chat` - AI 에이전트/검색 스트리밍
- Edge Function: `ai-summary` - 문서 요약
- Edge Function: `ai-idea` - 주제/목차 추천
- Lovable AI Gateway 사용 (google/gemini-3-flash-preview)

---

## 추천 구현 순서

지금 바로 시작할 수 있는 Phase 1부터 단계적으로 진행합니다.

1. **Phase 1** - 검색 고도화 (UI만, Mock 데이터) -- 바로 가능
2. **Phase 2** - AI 챗봇 UI 구현 (Mock 응답) -- 바로 가능
3. **Phase 3** - 시각화 (D3 기반) -- 바로 가능
4. **Lovable Cloud 연결 후** - AI 실제 동작 연동
5. **Phase 4** - AI 아이디어, Graph RAG

모든 UI는 Mock 데이터로 먼저 구현하고, 이후 Lovable Cloud를 연결하여 실제 AI 기능을 활성화하는 방식입니다.

