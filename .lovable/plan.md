
# Excel 내보내기에 산출물 시트 추가

## 개요
Excel 내보내기(`exportProposalToExcel`) 함수에 산출물(정의서, WBS, 견적서 등) 데이터를 별도 "산출물" 시트로 추가합니다. 워크플로우 페이지와 히스토리 페이지 양쪽 호출부도 산출물 데이터를 전달하도록 수정합니다.

## 변경 사항

### 1. `exportUtils.ts` - `exportProposalToExcel` 함수 수정
- 함수 시그니처에 `ExportDeliverable[]` 배열을 포함하는 `ExportSection` 타입(또는 동일 구조)을 받도록 확장
- "통합문서" 시트 앞에 **"산출물"** 시트를 추가
  - 컬럼: 요구사항 번호, 요구사항 제목, 산출물 유형, 산출물 제목, 내용(JSON을 텍스트로 변환)
  - `jsonToText`를 사용해 content를 평문으로 변환 (최대 5000자)
- 산출물이 하나도 없으면 시트 생성을 생략

### 2. `WorkflowPage.tsx` - Excel 버튼 호출부 수정
- 현재 `exportProposalToExcel(project, sections)`로 호출 중
- `sections`에 이미 deliverables가 포함되어 있으므로, 각 섹션의 deliverables를 `ExportSection` 형태로 매핑하여 전달

### 3. `HistoryPage.tsx` - Excel 내보내기 호출부 수정
- PDF 내보내기와 동일하게 `deliverables` 테이블에서 해당 프로젝트의 산출물을 조회
- 섹션별로 산출물을 매핑하여 `exportProposalToExcel`에 전달

## 기술 상세

### exportProposalToExcel 새 시그니처
```typescript
export function exportProposalToExcel(
  project: { title; model; current_stage; created_at; merged_document },
  sections: ExportSection[]  // ExportDeliverable[] 포함
)
```

### 산출물 시트 구조
| 요구사항 번호 | 요구사항 제목 | 산출물 유형 | 산출물 제목 | 내용 |
|---|---|---|---|---|
| REQ-001 | ... | 정의서 | ... | (텍스트 변환된 JSON) |

### HistoryPage Excel 호출 변경
기존 PDF 내보내기에서 산출물을 조회하는 패턴과 동일하게 `deliverables` 테이블을 쿼리하고 섹션에 매핑합니다.
