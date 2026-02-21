

# PDF 산출물 표 형식 렌더링

## 개요
현재 PDF 내보내기 시 산출물(정의서, WBS, 견적서, 제안서) 내용이 `formatDeliverableContent`를 통해 단순 텍스트로 출력됩니다. 이를 산출물 유형별로 구조화된 표(table) 형식으로 렌더링하여 가독성을 크게 개선합니다.

## 변경 대상

`src/features/proposal-assistant/lib/exportUtils.ts` 1개 파일만 수정합니다.

## 변경 내용

### 1. PDF 표 그리기 헬퍼 함수 추가

jsPDF에는 내장 테이블 기능이 없으므로, `rect`와 `text`를 조합하여 표를 그리는 헬퍼를 직접 구현합니다.

```
drawTable(doc, headers, rows, x, y, colWidths) -> newY
```

- 헤더 행: 파란 배경(41,98,255) + 흰색 텍스트
- 데이터 행: 짝수/홀수 줄 번갈아 배경색(회색 줄무늬)
- 셀 텍스트가 긴 경우 자동 줄바꿈 처리
- 페이지 하단에 도달하면 자동으로 새 페이지로 이동

### 2. 산출물 유형별 구조화된 렌더링 함수

기존 `formatDeliverableContent`(텍스트 반환)를 대체할 `renderDeliverableTable`(직접 PDF에 그리기) 함수를 추가합니다.

#### 요구사항 정의서 (definition)
- 기본 정보: 키-값 쌍 2열 표 (목적, 범위 등)
- 세부 요구사항, 인수 기준, 제약사항, 기대효과: 각각 번호 매긴 목록 표

#### 기술 제안서 (proposal)
- 현황/솔루션/아키텍처: 키-값 쌍 2열 표
- 기술 스택, 리스크, 대응방안, 성공요소: 목록 표

#### WBS (wbs)
- 단계별 작업 테이블: 작업코드 | 작업명 | 기간(일) | 산출물 | 투입인력
- 마일스톤 테이블: 마일스톤명 | 목표 주차

#### 견적서 (estimate)
- 비용 항목별 테이블: 세부항목 | 수량 | 단위 | 단가 | 합계 | 비고
- 카테고리별 소계 행 (강조 표시)
- 인력 투입 계획: 역할 | 등급 | 인원수 | 기간 | 단가 | 합계

### 3. 기존 렌더링 코드 교체

`exportProposalToPdf` 내 산출물 챕터(484-504줄)에서:
- 기존: `formatDeliverableContent` -> `addWrappedText`
- 변경: `renderDeliverableTable(doc, deliv.deliverable_type, deliv.content, y)` 직접 호출

`formatDeliverableContent` 함수는 Excel 등에서 여전히 사용하므로 삭제하지 않고 유지합니다.

## 기술 상세

### drawTable 함수 사양

```typescript
function drawTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  x: number,
  y: number,
  colWidths: number[],
  options?: { headerColor?: [number,number,number] }
): number  // returns new Y position
```

- 행 높이: 텍스트 줄바꿈에 따라 동적 계산
- 최소 행 높이: 7
- 셀 패딩: 2

### renderDeliverableTable 분기 로직

```typescript
function renderDeliverableTable(
  doc: jsPDF, type: string, content: Record<string, unknown>, y: number
): number
```

- `type`에 따라 `renderDefinitionTable`, `renderWbsTable`, `renderEstimateTable`, `renderProposalTable`로 분기
- 알 수 없는 type은 기존 텍스트 방식으로 폴백
