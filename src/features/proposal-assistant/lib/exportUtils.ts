import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { SavedAnalysis } from "../hooks/useSavedAnalyses";

const STEP_LABELS: Record<number, string> = {
  1: "사업 개요 분석",
  2: "기술 요구사항 분석",
  3: "리스크 분석",
  4: "경쟁 환경 분석",
  5: "실행 전략",
  6: "종합 평가",
};

// ── Helpers ──

function flattenJson(obj: unknown, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  if (obj == null) return result;
  if (typeof obj !== "object") {
    result[prefix || "value"] = String(obj);
    return result;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      Object.assign(result, flattenJson(item, `${prefix}[${i}]`));
    });
  } else {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      Object.assign(result, flattenJson(val, newKey));
    }
  }
  return result;
}

function jsonToText(data: unknown): string {
  if (data == null) return "(데이터 없음)";
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 2);
}

// ── Korean Font Loading ──

let cachedFontBase64: string | null = null;

async function loadKoreanFont(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;

  // Fetch Noto Sans KR Regular TTF from Google Fonts static CDN
  const fontUrl =
    "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLGC.ttf";

  const response = await fetch(fontUrl);
  if (!response.ok) throw new Error("폰트 다운로드에 실패했습니다.");
  const buffer = await response.arrayBuffer();

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}

async function createPdfWithKoreanFont(): Promise<jsPDF> {
  const doc = new jsPDF();

  try {
    const fontBase64 = await loadKoreanFont();
    doc.addFileToVFS("NotoSansKR-Regular.ttf", fontBase64);
    doc.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal");
    doc.setFont("NotoSansKR", "normal");
  } catch (err) {
    console.warn("한글 폰트 로딩 실패, 기본 폰트로 대체합니다:", err);
    // Fallback to default font
  }

  return doc;
}

// ── PDF shared helpers ──

const PAGE_MARGIN = 20;
const MAX_W = 170;
const PAGE_H = 297;
const CONTENT_BOTTOM = 280;
const FOOTER_Y = 290;

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    if (y > CONTENT_BOTTOM) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function addCoverPage(doc: jsPDF, title: string, subtitle: string, date: string) {
  // Background accent bar
  doc.setFillColor(41, 98, 255); // primary blue
  doc.rect(0, 0, 210, 12, "F");

  // Title area
  doc.setFontSize(28);
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(title, 160);
  let ty = 100;
  for (const line of titleLines) {
    doc.text(line, 105, ty, { align: "center" });
    ty += 14;
  }

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(subtitle, 105, ty + 10, { align: "center" });

  // Date
  doc.setFontSize(11);
  doc.text(date, 105, ty + 24, { align: "center" });

  // Bottom accent bar
  doc.setFillColor(41, 98, 255);
  doc.rect(0, PAGE_H - 12, 210, 12, "F");

  // Footer text
  doc.setFontSize(8);
  doc.setTextColor(255);
  doc.text("AI Proposal Assistant", 105, PAGE_H - 5, { align: "center" });
  doc.setTextColor(0);
}

interface TocEntry {
  title: string;
  page: number;
}

function addTocPage(doc: jsPDF, entries: TocEntry[]) {
  doc.addPage();

  // Header
  doc.setFillColor(41, 98, 255);
  doc.rect(PAGE_MARGIN, 18, 170, 1, "F");

  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text("목 차", PAGE_MARGIN, 15);

  let y = 30;
  doc.setFontSize(10);

  entries.forEach((entry, idx) => {
    if (y > CONTENT_BOTTOM) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    const num = `${idx + 1}.`;
    const pageStr = `${entry.page}`;

    doc.setTextColor(50);
    doc.text(num, PAGE_MARGIN, y);
    doc.text(entry.title, PAGE_MARGIN + 10, y);

    // Dotted line
    const titleW = doc.getTextWidth(entry.title) + PAGE_MARGIN + 10;
    const pageW = doc.getTextWidth(pageStr);
    const dotsStart = Math.min(titleW + 3, 190 - pageW - 3);
    const dotsEnd = 190 - pageW - 3;
    if (dotsEnd > dotsStart) {
      doc.setTextColor(180);
      let dx = dotsStart;
      while (dx < dotsEnd) {
        doc.text(".", dx, y);
        dx += 2;
      }
    }

    doc.setTextColor(50);
    doc.text(pageStr, 190, y, { align: "right" });
    y += 7;
  });
}

function addPageNumbers(doc: jsPDF, startPage = 2) {
  const totalPages = doc.getNumberOfPages();
  for (let i = startPage; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${i - startPage + 1} / ${totalPages - startPage + 1}`, 105, FOOTER_Y, { align: "center" });
  }
  doc.setTextColor(0);
}

function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  if (y > 250) {
    doc.addPage();
    y = PAGE_MARGIN;
  }
  doc.setFillColor(41, 98, 255);
  doc.rect(PAGE_MARGIN, y - 4, 170, 0.8, "F");
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  y = addWrappedText(doc, title, PAGE_MARGIN, y + 2, MAX_W, 7);
  y += 4;
  return y;
}

// ── Analysis PDF Export ──

export async function exportAnalysisToPdf(analysis: SavedAnalysis) {
  const doc = await createPdfWithKoreanFont();
  const dateStr = new Date(analysis.created_at).toLocaleString("ko-KR");

  // 1. Cover page
  addCoverPage(doc, analysis.title, "RFP 분석 보고서", dateStr);

  // Build TOC entries (we'll fill page numbers after rendering)
  const tocEntries: TocEntry[] = [
    { title: "RFP 원문", page: 0 },
    ...([1, 2, 3, 4, 5, 6] as const).map(n => ({
      title: `Step ${n}: ${STEP_LABELS[n]}`,
      page: 0,
    })),
  ];

  // 2. TOC placeholder page (page 2) — we'll overwrite after content
  addTocPage(doc, tocEntries);
  const tocPageNumber = 2;

  // 3. Content pages
  // RFP section
  doc.addPage();
  tocEntries[0].page = doc.getNumberOfPages();
  let y = PAGE_MARGIN;
  y = addSectionHeader(doc, "RFP 원문", y);
  doc.setFontSize(9);
  const rfpPreview = analysis.rfp_content.slice(0, 4000) + (analysis.rfp_content.length > 4000 ? "\n..." : "");
  y = addWrappedText(doc, rfpPreview, PAGE_MARGIN, y, MAX_W, 4.5);

  // Steps
  for (let step = 1; step <= 6; step++) {
    doc.addPage();
    tocEntries[step].page = doc.getNumberOfPages();
    y = PAGE_MARGIN;
    y = addSectionHeader(doc, `Step ${step}: ${STEP_LABELS[step]}`, y);

    const data = analysis[`step${step}_data` as keyof SavedAnalysis];
    doc.setFontSize(9);
    const content = jsonToText(data).slice(0, 5000);
    y = addWrappedText(doc, content, PAGE_MARGIN, y, MAX_W, 4.5);
  }

  // 4. Rewrite TOC with correct page numbers
  doc.setPage(tocPageNumber);
  // Clear the page content by overlaying white rect, then redraw
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, PAGE_H, "F");
  // Redraw TOC header
  doc.setFillColor(41, 98, 255);
  doc.rect(PAGE_MARGIN, 18, 170, 1, "F");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text("목 차", PAGE_MARGIN, 15);

  let tocY = 30;
  doc.setFontSize(10);
  tocEntries.forEach((entry, idx) => {
    const num = `${idx + 1}.`;
    const adjustedPage = entry.page - tocPageNumber; // relative to content start
    const pageStr = `${adjustedPage}`;

    doc.setTextColor(50);
    doc.text(num, PAGE_MARGIN, tocY);
    doc.text(entry.title, PAGE_MARGIN + 10, tocY);
    const pageW = doc.getTextWidth(pageStr);
    doc.text(pageStr, 190, tocY, { align: "right" });
    tocY += 7;
  });

  // 5. Page numbers (skip cover)
  addPageNumbers(doc, 2);

  doc.save(`${analysis.title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}_분석결과.pdf`);
}

// ── Deep Research Step Labels ──

const RESEARCH_STEP_LABELS: Record<string, string> = {
  "1_background": "배경분석",
  "2_cases": "사례조사",
  "3_technology": "기술분석",
  "4_comparison": "비교분석",
  "5_synthesis": "종합보고서",
};

const RESEARCH_STEP_KEYS = ["1_background", "2_cases", "3_technology", "4_comparison", "5_synthesis"];

function renderResearchStepData(doc: jsPDF, data: Record<string, unknown>, startY: number): number {
  let y = startY;
  doc.setFontSize(9);
  doc.setTextColor(0);

  for (const [key, value] of Object.entries(data)) {
    if (key === "step_title") continue;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    // Sub-heading
    doc.setFontSize(9);
    doc.setTextColor(41, 98, 255);
    y = addWrappedText(doc, `▸ ${label}`, PAGE_MARGIN + 2, y, MAX_W - 4, 4.5);
    doc.setTextColor(0);
    y += 1;

    if (typeof value === "string") {
      doc.setFontSize(8.5);
      y = addWrappedText(doc, value, PAGE_MARGIN + 4, y, MAX_W - 8, 4);
    } else if (Array.isArray(value)) {
      doc.setFontSize(8.5);
      for (const item of value) {
        const text = typeof item === "string" ? `• ${item}` : `• ${JSON.stringify(item)}`;
        y = addWrappedText(doc, text, PAGE_MARGIN + 4, y, MAX_W - 8, 4);
      }
    } else if (typeof value === "object" && value !== null) {
      doc.setFontSize(8);
      const text = JSON.stringify(value, null, 2);
      y = addWrappedText(doc, text.slice(0, 3000), PAGE_MARGIN + 4, y, MAX_W - 8, 3.8);
    }
    y += 3;
  }
  return y;
}

// ── Proposal PDF Export (with Deep Research) ──

const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  definition: "요구사항 정의서",
  proposal: "기술 제안서",
  wbs: "WBS (작업분해구조)",
  estimate: "견적서",
};

export interface ExportDeliverable {
  deliverable_type: string;
  title: string;
  content: Record<string, unknown>;
  status: string;
}

export interface ExportSection {
  requirement_number: string;
  requirement_title: string;
  requirement_description: string | null;
  research_data: Record<string, unknown> | null;
  draft_content: Record<string, unknown> | null;
  deliverables?: ExportDeliverable[];
}

export async function exportProposalToPdf(
  project: { title: string; model: string; current_stage: string; created_at: string; merged_document: Record<string, unknown> | null },
  sections: ExportSection[]
) {
  const doc = await createPdfWithKoreanFont();
  const dateStr = new Date(project.created_at).toLocaleString("ko-KR");

  // 1. Cover
  addCoverPage(doc, project.title, `제안서 | 모델: ${project.model}`, dateStr);

  // Build TOC entries
  const tocEntries: TocEntry[] = [];

  // For each section: research chapter + draft chapter
  for (const sec of sections) {
    const hasResearch = sec.research_data && (sec.research_data as Record<string, unknown>).steps;
    if (hasResearch) {
      tocEntries.push({
        title: `[${sec.requirement_number}] 딥리서치 - ${sec.requirement_title}`,
        page: 0,
      });
    }
    if (sec.draft_content) {
      tocEntries.push({
        title: `[${sec.requirement_number}] 제안서 초안 - ${sec.requirement_title}`,
        page: 0,
      });
    }
    // Deliverables
    const completedDeliverables = (sec.deliverables || []).filter(d => d.status === "completed");
    if (completedDeliverables.length > 0) {
      tocEntries.push({
        title: `[${sec.requirement_number}] 산출물 - ${sec.requirement_title}`,
        page: 0,
      });
    }
  }

  if (project.merged_document) {
    tocEntries.push({ title: "통합 제안서", page: 0 });
  }

  // 2. TOC placeholder
  addTocPage(doc, tocEntries);
  const tocPageNumber = 2;

  // 3. Content pages
  let tocIdx = 0;

  for (const sec of sections) {
    const deepData = sec.research_data as Record<string, unknown> | null;
    const steps = deepData?.steps as Record<string, { status: string; data: Record<string, unknown> | null }> | undefined;

    // Deep Research chapter
    if (steps) {
      doc.addPage();
      tocEntries[tocIdx].page = doc.getNumberOfPages();
      tocIdx++;

      let y = PAGE_MARGIN;
      y = addSectionHeader(doc, `[${sec.requirement_number}] 딥리서치: ${sec.requirement_title}`, y);

      if (sec.requirement_description) {
        doc.setFontSize(8.5);
        doc.setTextColor(80);
        y = addWrappedText(doc, sec.requirement_description, PAGE_MARGIN, y, MAX_W, 4);
        doc.setTextColor(0);
        y += 4;
      }

      // Render each of the 5 steps
      for (const stepKey of RESEARCH_STEP_KEYS) {
        const stepInfo = steps[stepKey];
        if (!stepInfo?.data || stepInfo.status !== "completed") continue;

        // Step sub-header
        if (y > 250) {
          doc.addPage();
          y = PAGE_MARGIN;
        }

        doc.setFillColor(230, 236, 255);
        doc.rect(PAGE_MARGIN, y - 3, MAX_W, 7, "F");
        doc.setFontSize(10);
        doc.setTextColor(41, 98, 255);
        const stepLabel = RESEARCH_STEP_LABELS[stepKey] || stepKey;
        y = addWrappedText(doc, `Step: ${stepLabel}`, PAGE_MARGIN + 2, y, MAX_W - 4, 5);
        doc.setTextColor(0);
        y += 3;

        y = renderResearchStepData(doc, stepInfo.data, y);
        y += 4;
      }
    }

    // Draft chapter
    if (sec.draft_content) {
      doc.addPage();
      tocEntries[tocIdx].page = doc.getNumberOfPages();
      tocIdx++;

      let y = PAGE_MARGIN;
      y = addSectionHeader(doc, `[${sec.requirement_number}] 제안서 초안: ${sec.requirement_title}`, y);

      doc.setFontSize(9);
      const draftText = formatDraftContent(sec.draft_content);
      y = addWrappedText(doc, draftText, PAGE_MARGIN, y, MAX_W, 4.5);
    }

    // Deliverables chapter
    const completedDeliverables = (sec.deliverables || []).filter(d => d.status === "completed");
    if (completedDeliverables.length > 0) {
      doc.addPage();
      tocEntries[tocIdx].page = doc.getNumberOfPages();
      tocIdx++;

      let y = PAGE_MARGIN;
      y = addSectionHeader(doc, `[${sec.requirement_number}] 산출물: ${sec.requirement_title}`, y);

      for (const deliv of completedDeliverables) {
        if (y > 250) {
          doc.addPage();
          y = PAGE_MARGIN;
        }

        // Deliverable type sub-header
        const typeLabel = DELIVERABLE_TYPE_LABELS[deliv.deliverable_type] || deliv.deliverable_type;
        doc.setFillColor(230, 245, 230);
        doc.rect(PAGE_MARGIN, y - 3, MAX_W, 7, "F");
        doc.setFontSize(10);
        doc.setTextColor(34, 139, 34);
        y = addWrappedText(doc, `▸ ${typeLabel}: ${deliv.title}`, PAGE_MARGIN + 2, y, MAX_W - 4, 5);
        doc.setTextColor(0);
        y += 3;

        // Render deliverable content as structured table
        y = renderDeliverableTable(doc, deliv.deliverable_type, deliv.content, y);
        y += 6;
      }
    }
  }

  // Merged document
  if (project.merged_document) {
    doc.addPage();
    tocEntries[tocIdx].page = doc.getNumberOfPages();
    let y = PAGE_MARGIN;
    y = addSectionHeader(doc, "통합 제안서", y);
    doc.setFontSize(9);
    y = addWrappedText(doc, jsonToText(project.merged_document).slice(0, 8000), PAGE_MARGIN, y, MAX_W, 4.5);
  }

  // 4. Rewrite TOC
  doc.setPage(tocPageNumber);
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, PAGE_H, "F");
  doc.setFillColor(41, 98, 255);
  doc.rect(PAGE_MARGIN, 18, 170, 1, "F");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text("목 차", PAGE_MARGIN, 15);

  let tocY = 30;
  doc.setFontSize(10);
  tocEntries.forEach((entry, idx) => {
    if (tocY > CONTENT_BOTTOM) {
      // Handle TOC overflow
      tocY = 30;
    }
    const num = `${idx + 1}.`;
    const adjustedPage = entry.page - tocPageNumber;
    const pageStr = `${adjustedPage}`;
    doc.setTextColor(50);
    doc.text(num, PAGE_MARGIN, tocY);

    const maxTitleW = 140;
    let titleText = entry.title;
    while (doc.getTextWidth(titleText) > maxTitleW && titleText.length > 10) {
      titleText = titleText.slice(0, -2) + "…";
    }
    doc.text(titleText, PAGE_MARGIN + 10, tocY);
    doc.text(pageStr, 190, tocY, { align: "right" });
    tocY += 7;
  });

  // 5. Page numbers
  addPageNumbers(doc, 2);

  doc.save(`${project.title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}_제안서.pdf`);
}

// ── PDF Table Drawing Helper ──

function wrapCellText(doc: jsPDF, text: string, maxWidth: number): string[] {
  if (!text) return [""];
  return doc.splitTextToSize(text, maxWidth);
}

function drawTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  x: number,
  y: number,
  colWidths: number[],
  options?: { headerColor?: [number, number, number]; highlightRows?: number[] }
): number {
  const cellPadding = 2;
  const minRowH = 7;
  const headerColor = options?.headerColor || [41, 98, 255];
  const highlightRows = new Set(options?.highlightRows || []);
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  const calcRowHeight = (cells: string[]): number => {
    let maxLines = 1;
    cells.forEach((cell, ci) => {
      const lines = wrapCellText(doc, cell, colWidths[ci] - cellPadding * 2);
      if (lines.length > maxLines) maxLines = lines.length;
    });
    return Math.max(minRowH, maxLines * 4 + cellPadding * 2);
  };

  const drawRowFn = (cells: string[], rowY: number, isHeader: boolean, isHighlight: boolean, isEven: boolean): number => {
    const rowH = calcRowHeight(cells);
    if (rowY + rowH > CONTENT_BOTTOM) {
      doc.addPage();
      rowY = PAGE_MARGIN;
      if (!isHeader) {
        rowY = drawRowFn(headers, rowY, true, false, false);
      }
    }
    if (isHeader) {
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(x, rowY, totalW, rowH, "F");
    } else if (isHighlight) {
      doc.setFillColor(255, 248, 220);
      doc.rect(x, rowY, totalW, rowH, "F");
    } else if (isEven) {
      doc.setFillColor(245, 247, 250);
      doc.rect(x, rowY, totalW, rowH, "F");
    }
    let cx = x;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    for (const w of colWidths) {
      doc.rect(cx, rowY, w, rowH, "S");
      cx += w;
    }
    doc.setFontSize(isHeader ? 8.5 : 8);
    if (isHeader) { doc.setTextColor(255, 255, 255); }
    else if (isHighlight) { doc.setTextColor(100, 80, 0); }
    else { doc.setTextColor(30, 30, 30); }
    cx = x;
    cells.forEach((cell, ci) => {
      const lines = wrapCellText(doc, cell, colWidths[ci] - cellPadding * 2);
      let ty = rowY + cellPadding + 3;
      for (const line of lines) {
        doc.text(line, cx + cellPadding, ty);
        ty += 4;
      }
      cx += colWidths[ci];
    });
    doc.setTextColor(0);
    return rowY + rowH;
  };

  y = drawRowFn(headers, y, true, false, false);
  rows.forEach((row, ri) => {
    y = drawRowFn(row, y, false, highlightRows.has(ri), ri % 2 === 0);
  });
  return y;
}

function addSubSectionTitle(doc: jsPDF, title: string, y: number): number {
  if (y > 260) { doc.addPage(); y = PAGE_MARGIN; }
  doc.setFontSize(9.5);
  doc.setTextColor(41, 98, 255);
  y = addWrappedText(doc, `■ ${title}`, PAGE_MARGIN, y, MAX_W, 5);
  doc.setTextColor(0);
  y += 2;
  return y;
}

function renderKeyValueTable(doc: jsPDF, data: Record<string, unknown>, y: number, keys?: string[], labels?: Record<string, string>): number {
  const rows: string[][] = [];
  const entries = keys
    ? keys.filter(k => data[k] != null).map(k => [k, data[k]] as [string, unknown])
    : Object.entries(data).filter(([, v]) => v != null && typeof v !== "object");
  for (const [key, value] of entries) {
    const label = labels?.[key] || key.replace(/_/g, " ");
    rows.push([label, typeof value === "string" ? value : JSON.stringify(value)]);
  }
  if (rows.length === 0) return y;
  return drawTable(doc, ["항목", "내용"], rows, PAGE_MARGIN, y, [40, 130]);
}

function renderListTable(doc: jsPDF, title: string, items: unknown[], y: number): number {
  if (!items || items.length === 0) return y;
  y = addSubSectionTitle(doc, title, y);
  const rows = items.map((item, i) => {
    const text = typeof item === "string" ? item : JSON.stringify(item);
    return [String(i + 1), text];
  });
  y = drawTable(doc, ["번호", "내용"], rows, PAGE_MARGIN, y, [15, 155]);
  y += 4;
  return y;
}

// ── Type-specific deliverable renderers ──

function renderDefinitionTable(doc: jsPDF, content: Record<string, unknown>, y: number): number {
  const infoKeys = ["purpose", "scope", "target_system", "project_duration", "stakeholders"];
  const infoLabels: Record<string, string> = { purpose: "목적", scope: "범위", target_system: "대상 시스템", project_duration: "프로젝트 기간", stakeholders: "이해관계자" };
  if (infoKeys.some(k => content[k])) {
    y = addSubSectionTitle(doc, "기본 정보", y);
    y = renderKeyValueTable(doc, content, y, infoKeys, infoLabels);
    y += 4;
  }
  const listSections: [string, string][] = [
    ["requirements", "세부 요구사항"], ["detailed_requirements", "상세 요구사항"],
    ["acceptance_criteria", "인수 기준"], ["constraints", "제약사항"],
    ["expected_outcomes", "기대효과"], ["assumptions", "가정사항"],
  ];
  for (const [key, label] of listSections) {
    if (Array.isArray(content[key]) && (content[key] as unknown[]).length > 0) {
      y = renderListTable(doc, label, content[key] as unknown[], y);
    }
  }
  const handledKeys = new Set([...infoKeys, ...listSections.map(([k]) => k)]);
  for (const [key, value] of Object.entries(content)) {
    if (handledKeys.has(key)) continue;
    if (typeof value === "string") {
      y = addSubSectionTitle(doc, key.replace(/_/g, " "), y);
      doc.setFontSize(8.5); y = addWrappedText(doc, value, PAGE_MARGIN, y, MAX_W, 4); y += 3;
    } else if (Array.isArray(value) && value.length > 0) {
      y = renderListTable(doc, key.replace(/_/g, " "), value, y);
    }
  }
  return y;
}

function renderWbsTable(doc: jsPDF, content: Record<string, unknown>, y: number): number {
  const phases = (content.phases || content.work_packages || content.tasks) as unknown[];
  if (Array.isArray(phases) && phases.length > 0) {
    y = addSubSectionTitle(doc, "작업 분해 구조", y);
    const rows: string[][] = [];
    const highlightRows: number[] = [];
    for (const phase of phases) {
      if (typeof phase === "object" && phase !== null) {
        const p = phase as Record<string, unknown>;
        if (p.phase_name || p.name) {
          highlightRows.push(rows.length);
          rows.push([String(p.code || p.phase_code || ""), String(p.phase_name || p.name || ""), String(p.duration || ""), "", ""]);
        }
        const tasks = (p.tasks || p.activities) as unknown[];
        if (Array.isArray(tasks)) {
          for (const task of tasks) {
            const t = task as Record<string, unknown>;
            rows.push([String(t.code || t.task_code || ""), String(t.name || t.task_name || t.title || ""), String(t.duration || t.days || ""), String(t.deliverable || t.output || ""), String(t.resources || t.personnel || "")]);
          }
        }
      } else if (typeof phase === "string") {
        rows.push(["", phase, "", "", ""]);
      }
    }
    if (rows.length > 0) {
      y = drawTable(doc, ["코드", "작업명", "기간(일)", "산출물", "투입인력"], rows, PAGE_MARGIN, y, [18, 60, 20, 40, 32], { highlightRows });
      y += 4;
    }
  }
  const milestones = content.milestones as unknown[];
  if (Array.isArray(milestones) && milestones.length > 0) {
    y = addSubSectionTitle(doc, "마일스톤", y);
    const rows = milestones.map(m => {
      if (typeof m === "object" && m !== null) {
        const ms = m as Record<string, unknown>;
        return [String(ms.name || ms.milestone || ""), String(ms.week || ms.target_week || ms.date || "")];
      }
      return [String(m), ""];
    });
    y = drawTable(doc, ["마일스톤", "목표 시점"], rows, PAGE_MARGIN, y, [110, 60]);
    y += 4;
  }
  const handledKeys = new Set(["phases", "work_packages", "tasks", "milestones", "schedule", "timeline"]);
  for (const [key, value] of Object.entries(content)) {
    if (handledKeys.has(key)) continue;
    if (typeof value === "string") {
      y = addSubSectionTitle(doc, key.replace(/_/g, " "), y);
      doc.setFontSize(8.5); y = addWrappedText(doc, value, PAGE_MARGIN, y, MAX_W, 4); y += 3;
    } else if (Array.isArray(value) && value.length > 0) {
      y = renderListTable(doc, key.replace(/_/g, " "), value, y);
    }
  }
  return y;
}

function renderEstimateTable(doc: jsPDF, content: Record<string, unknown>, y: number): number {
  const categories = (content.categories || content.cost_categories || content.cost_items) as unknown[];
  if (Array.isArray(categories) && categories.length > 0) {
    y = addSubSectionTitle(doc, "비용 내역", y);
    const rows: string[][] = [];
    const highlightRows: number[] = [];
    for (const cat of categories) {
      if (typeof cat === "object" && cat !== null) {
        const c = cat as Record<string, unknown>;
        if (c.category || c.name) {
          highlightRows.push(rows.length);
          rows.push([String(c.category || c.name || ""), "", "", "", String(c.subtotal || c.total || ""), ""]);
        }
        const items = (c.items || c.details) as unknown[];
        if (Array.isArray(items)) {
          for (const item of items) {
            const it = item as Record<string, unknown>;
            rows.push([String(it.name || it.item || ""), String(it.quantity || it.qty || ""), String(it.unit || ""), String(it.unit_price || it.price || ""), String(it.total || it.amount || ""), String(it.note || it.remarks || "")]);
          }
        }
      }
    }
    if (rows.length > 0) {
      y = drawTable(doc, ["항목", "수량", "단위", "단가", "합계", "비고"], rows, PAGE_MARGIN, y, [45, 18, 18, 25, 30, 34], { highlightRows });
      y += 4;
    }
  }
  if (content.total || content.grand_total || content.total_cost) {
    doc.setFontSize(9);
    doc.setTextColor(41, 98, 255);
    y = addWrappedText(doc, `총 합계: ${String(content.total || content.grand_total || content.total_cost)}`, PAGE_MARGIN, y, MAX_W, 5);
    doc.setTextColor(0); y += 3;
  }
  const personnel = (content.personnel || content.manpower || content.resource_plan) as unknown[];
  if (Array.isArray(personnel) && personnel.length > 0) {
    y = addSubSectionTitle(doc, "인력 투입 계획", y);
    const rows = personnel.map(p => {
      if (typeof p === "object" && p !== null) {
        const pr = p as Record<string, unknown>;
        return [String(pr.role || pr.position || ""), String(pr.grade || pr.level || ""), String(pr.count || pr.headcount || ""), String(pr.duration || pr.period || ""), String(pr.unit_price || pr.monthly_rate || ""), String(pr.total || pr.subtotal || "")];
      }
      return [String(p), "", "", "", "", ""];
    });
    y = drawTable(doc, ["역할", "등급", "인원", "기간", "단가", "합계"], rows, PAGE_MARGIN, y, [35, 22, 18, 22, 30, 43]);
    y += 4;
  }
  const handledKeys = new Set(["categories", "cost_categories", "cost_items", "total", "grand_total", "total_cost", "personnel", "manpower", "resource_plan"]);
  for (const [key, value] of Object.entries(content)) {
    if (handledKeys.has(key)) continue;
    if (typeof value === "string") {
      y = addSubSectionTitle(doc, key.replace(/_/g, " "), y);
      doc.setFontSize(8.5); y = addWrappedText(doc, value, PAGE_MARGIN, y, MAX_W, 4); y += 3;
    } else if (Array.isArray(value) && value.length > 0) {
      y = renderListTable(doc, key.replace(/_/g, " "), value, y);
    }
  }
  return y;
}

function renderProposalTypeTable(doc: jsPDF, content: Record<string, unknown>, y: number): number {
  const kvKeys = ["current_status", "solution", "architecture", "overview", "approach", "methodology"];
  const kvLabels: Record<string, string> = { current_status: "현황 분석", solution: "솔루션", architecture: "아키텍처", overview: "개요", approach: "접근 방안", methodology: "방법론" };
  for (const key of kvKeys) {
    if (content[key] && typeof content[key] === "string") {
      y = addSubSectionTitle(doc, kvLabels[key] || key, y);
      doc.setFontSize(8.5); y = addWrappedText(doc, content[key] as string, PAGE_MARGIN, y, MAX_W, 4); y += 3;
    } else if (content[key] && typeof content[key] === "object" && !Array.isArray(content[key])) {
      y = addSubSectionTitle(doc, kvLabels[key] || key, y);
      y = renderKeyValueTable(doc, content[key] as Record<string, unknown>, y); y += 3;
    }
  }
  const listSections: [string, string][] = [
    ["tech_stack", "기술 스택"], ["technology_stack", "기술 스택"], ["risks", "리스크"],
    ["risk_factors", "리스크 요인"], ["countermeasures", "대응 방안"], ["mitigation_strategies", "리스크 대응"],
    ["success_factors", "핵심 성공 요소"], ["key_features", "핵심 기능"], ["benefits", "기대 효과"],
  ];
  for (const [key, label] of listSections) {
    if (Array.isArray(content[key]) && (content[key] as unknown[]).length > 0) {
      y = renderListTable(doc, label, content[key] as unknown[], y);
    }
  }
  const handledKeys = new Set([...kvKeys, ...listSections.map(([k]) => k)]);
  for (const [key, value] of Object.entries(content)) {
    if (handledKeys.has(key)) continue;
    if (typeof value === "string") {
      y = addSubSectionTitle(doc, key.replace(/_/g, " "), y);
      doc.setFontSize(8.5); y = addWrappedText(doc, value, PAGE_MARGIN, y, MAX_W, 4); y += 3;
    } else if (Array.isArray(value) && value.length > 0) {
      y = renderListTable(doc, key.replace(/_/g, " "), value, y);
    }
  }
  return y;
}

function renderDeliverableTable(doc: jsPDF, type: string, content: Record<string, unknown>, y: number): number {
  switch (type) {
    case "definition": return renderDefinitionTable(doc, content, y);
    case "wbs": return renderWbsTable(doc, content, y);
    case "estimate": return renderEstimateTable(doc, content, y);
    case "proposal": return renderProposalTypeTable(doc, content, y);
    default: {
      doc.setFontSize(9);
      const contentText = formatDeliverableContent(type, content);
      return addWrappedText(doc, contentText, PAGE_MARGIN, y, MAX_W, 4.5);
    }
  }
}

// Helper to format deliverable content (kept for Excel/fallback)
function formatDeliverableContent(type: string, data: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    if (typeof value === "string") {
      parts.push(`[${label}]\n${value}`);
    } else if (Array.isArray(value)) {
      parts.push(`[${label}]\n${value.map(v => `• ${typeof v === "string" ? v : JSON.stringify(v)}`).join("\n")}`);
    } else if (typeof value === "object" && value !== null) {
      parts.push(`[${label}]\n${JSON.stringify(value, null, 2)}`);
    }
  }
  return parts.join("\n\n") || "(데이터 없음)";
}

// Helper to format draft content nicely
function formatDraftContent(data: Record<string, unknown>): string {
  const parts: string[] = [];
  const fieldLabels: Record<string, string> = {
    section_title: "제목",
    understanding: "요구사항 이해",
    approach: "접근 방안",
    implementation_plan: "구현 계획",
    expected_outcomes: "기대 효과",
  };

  for (const [key, value] of Object.entries(data)) {
    const label = fieldLabels[key] || key.replace(/_/g, " ");
    if (typeof value === "string") {
      parts.push(`[${label}]\n${value}`);
    } else if (Array.isArray(value)) {
      parts.push(`[${label}]\n${value.map(v => `• ${typeof v === "string" ? v : JSON.stringify(v)}`).join("\n")}`);
    } else if (typeof value === "object" && value !== null) {
      parts.push(`[${label}]\n${JSON.stringify(value, null, 2)}`);
    }
  }
  return parts.join("\n\n");
}

// ── Excel Export ──

export function exportAnalysisToExcel(analysis: SavedAnalysis) {
  const wb = XLSX.utils.book_new();

  // Overview sheet
  const overviewData = [
    ["제목", analysis.title],
    ["생성일", new Date(analysis.created_at).toLocaleString("ko-KR")],
    ["RFP 내용 (요약)", analysis.rfp_content.slice(0, 500)],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview["!cols"] = [{ wch: 20 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, "개요");

  // Each step as a sheet
  for (let step = 1; step <= 6; step++) {
    const data = analysis[`step${step}_data` as keyof SavedAnalysis] as Record<string, unknown> | null;
    const flat = flattenJson(data);
    const rows = Object.entries(flat).map(([k, v]) => [k, v]);
    if (rows.length === 0) rows.push(["상태", "데이터 없음"]);
    rows.unshift(["키", "값"]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 40 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, ws, `Step${step}_${STEP_LABELS[step].slice(0, 10)}`);
  }

  XLSX.writeFile(wb, `${analysis.title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}_분석결과.xlsx`);
}

export function exportProposalToExcel(
  project: { title: string; model: string; current_stage: string; created_at: string; merged_document: Record<string, unknown> | null },
  sections: ExportSection[]
) {
  const wb = XLSX.utils.book_new();

  // Overview
  const overviewData = [
    ["제목", project.title],
    ["모델", project.model],
    ["현재 단계", project.current_stage],
    ["생성일", new Date(project.created_at).toLocaleString("ko-KR")],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview["!cols"] = [{ wch: 15 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, "개요");

  // Requirements summary
  const reqRows: (string | null)[][] = [["번호", "제목", "설명", "우선순위", "조사상태", "초안상태"]];
  for (const sec of sections) {
    reqRows.push([sec.requirement_number, sec.requirement_title, sec.requirement_description, (sec as any).priority ?? "", (sec as any).research_status ?? "", (sec as any).draft_status ?? ""]);
  }
  const wsReq = XLSX.utils.aoa_to_sheet(reqRows);
  wsReq["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 50 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsReq, "요구사항");

  // Drafts
  const draftRows: string[][] = [["번호", "제목", "초안 내용"]];
  for (const sec of sections) {
    draftRows.push([sec.requirement_number, sec.requirement_title, sec.draft_content ? jsonToText(sec.draft_content).slice(0, 5000) : ""]);
  }
  const wsDraft = XLSX.utils.aoa_to_sheet(draftRows);
  wsDraft["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsDraft, "초안");

  // Deliverables sheet
  const allDeliverables: { req_num: string; req_title: string; type: string; title: string; content: string }[] = [];
  for (const sec of sections) {
    const delivs = (sec.deliverables || []).filter(d => d.status === "completed");
    for (const d of delivs) {
      const typeLabel = DELIVERABLE_TYPE_LABELS[d.deliverable_type] || d.deliverable_type;
      allDeliverables.push({
        req_num: sec.requirement_number,
        req_title: sec.requirement_title,
        type: typeLabel,
        title: d.title,
        content: jsonToText(d.content).slice(0, 5000),
      });
    }
  }
  if (allDeliverables.length > 0) {
    const delivRows: string[][] = [["요구사항 번호", "요구사항 제목", "산출물 유형", "산출물 제목", "내용"]];
    for (const d of allDeliverables) {
      delivRows.push([d.req_num, d.req_title, d.type, d.title, d.content]);
    }
    const wsDeliv = XLSX.utils.aoa_to_sheet(delivRows);
    wsDeliv["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsDeliv, "산출물");
  }

  // Merged document
  if (project.merged_document) {
    const flat = flattenJson(project.merged_document);
    const rows = Object.entries(flat).map(([k, v]) => [k, v]);
    rows.unshift(["키", "값"]);
    const wsMerged = XLSX.utils.aoa_to_sheet(rows);
    wsMerged["!cols"] = [{ wch: 40 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsMerged, "통합문서");
  }

  XLSX.writeFile(wb, `${project.title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}_제안서.xlsx`);
}

// ── Markdown Export ──

function renderDataToMarkdown(data: Record<string, unknown>, indent = ""): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === "step_title") continue;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    if (typeof value === "string") {
      parts.push(`${indent}**${label}**\n\n${indent}${value}`);
    } else if (Array.isArray(value)) {
      const items = value.map(v => `${indent}- ${typeof v === "string" ? v : JSON.stringify(v)}`).join("\n");
      parts.push(`${indent}**${label}**\n\n${items}`);
    } else if (typeof value === "object" && value !== null) {
      parts.push(`${indent}**${label}**\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``);
    }
  }
  return parts.join("\n\n");
}

export function exportProposalToMarkdown(
  project: { title: string; model: string; current_stage: string; created_at: string; merged_document: Record<string, unknown> | null },
  sections: ExportSection[]
) {
  const dateStr = new Date(project.created_at).toLocaleString("ko-KR");
  const lines: string[] = [];

  lines.push(`# ${project.title}`);
  lines.push(`\n> 모델: ${project.model} | 생성일: ${dateStr}\n`);
  lines.push(`---\n`);

  // Table of Contents
  lines.push(`## 목차\n`);
  let tocNum = 1;
  for (const sec of sections) {
    const deep = sec.research_data as Record<string, unknown> | null;
    const steps = deep?.steps as Record<string, { status: string; data: Record<string, unknown> | null }> | undefined;
    if (steps) {
      lines.push(`${tocNum}. [${sec.requirement_number}] 딥리서치 - ${sec.requirement_title}`);
      tocNum++;
    }
    if (sec.draft_content) {
      lines.push(`${tocNum}. [${sec.requirement_number}] 제안서 초안 - ${sec.requirement_title}`);
      tocNum++;
    }
    const completedDelivs = (sec.deliverables || []).filter(d => d.status === "completed");
    if (completedDelivs.length > 0) {
      lines.push(`${tocNum}. [${sec.requirement_number}] 산출물 - ${sec.requirement_title}`);
      tocNum++;
    }
  }
  if (project.merged_document) {
    lines.push(`${tocNum}. 통합 제안서`);
  }
  lines.push("");

  // Content
  for (const sec of sections) {
    const deep = sec.research_data as Record<string, unknown> | null;
    const steps = deep?.steps as Record<string, { status: string; data: Record<string, unknown> | null }> | undefined;

    // Deep Research
    if (steps) {
      lines.push(`\n---\n`);
      lines.push(`## [${sec.requirement_number}] 딥리서치: ${sec.requirement_title}\n`);
      if (sec.requirement_description) {
        lines.push(`> ${sec.requirement_description}\n`);
      }

      for (const stepKey of RESEARCH_STEP_KEYS) {
        const stepInfo = steps[stepKey];
        if (!stepInfo?.data || stepInfo.status !== "completed") continue;
        const stepLabel = RESEARCH_STEP_LABELS[stepKey] || stepKey;
        lines.push(`### Step: ${stepLabel}\n`);
        lines.push(renderDataToMarkdown(stepInfo.data));
        lines.push("");
      }
    }

    // Draft
    if (sec.draft_content) {
      lines.push(`\n---\n`);
      lines.push(`## [${sec.requirement_number}] 제안서 초안: ${sec.requirement_title}\n`);
      lines.push(renderDataToMarkdown(sec.draft_content));
      lines.push("");
    }

    // Deliverables
    const completedDelivs = (sec.deliverables || []).filter(d => d.status === "completed");
    if (completedDelivs.length > 0) {
      lines.push(`\n---\n`);
      lines.push(`## [${sec.requirement_number}] 산출물: ${sec.requirement_title}\n`);
      for (const deliv of completedDelivs) {
        const typeLabel = DELIVERABLE_TYPE_LABELS[deliv.deliverable_type] || deliv.deliverable_type;
        lines.push(`### ${typeLabel}: ${deliv.title}\n`);
        lines.push(renderDataToMarkdown(deliv.content));
        lines.push("");
      }
    }
  }

  // Merged document
  if (project.merged_document) {
    lines.push(`\n---\n`);
    lines.push(`## 통합 제안서\n`);
    lines.push(renderDataToMarkdown(project.merged_document));
  }

  const markdown = lines.join("\n");
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}_제안서.md`;
  a.click();
  URL.revokeObjectURL(url);
}
