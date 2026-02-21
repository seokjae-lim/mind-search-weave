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

// ── PDF Export (text-based, no font embedding needed for Korean via UTF-8) ──

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function exportAnalysisToPdf(analysis: SavedAnalysis) {
  const doc = new jsPDF();
  const maxW = 170;
  let y = 20;

  // Title
  doc.setFontSize(16);
  y = addWrappedText(doc, analysis.title, 20, y, maxW, 8);
  y += 4;

  doc.setFontSize(9);
  doc.setTextColor(120);
  y = addWrappedText(doc, `Created: ${new Date(analysis.created_at).toLocaleString("ko-KR")}`, 20, y, maxW, 5);
  doc.setTextColor(0);
  y += 6;

  // RFP Content
  doc.setFontSize(12);
  y = addWrappedText(doc, "RFP Content", 20, y, maxW, 6);
  y += 2;
  doc.setFontSize(8);
  const rfpPreview = analysis.rfp_content.slice(0, 2000) + (analysis.rfp_content.length > 2000 ? "..." : "");
  y = addWrappedText(doc, rfpPreview, 20, y, maxW, 4);
  y += 8;

  // Steps
  for (let step = 1; step <= 6; step++) {
    const data = analysis[`step${step}_data` as keyof SavedAnalysis];
    doc.setFontSize(12);
    y = addWrappedText(doc, `Step ${step}: ${STEP_LABELS[step]}`, 20, y, maxW, 6);
    y += 2;
    doc.setFontSize(8);
    const content = jsonToText(data).slice(0, 3000);
    y = addWrappedText(doc, content, 20, y, maxW, 4);
    y += 8;
  }

  doc.save(`${analysis.title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}_분석결과.pdf`);
}

export function exportProposalToPdf(
  project: { title: string; model: string; current_stage: string; created_at: string; merged_document: Record<string, unknown> | null },
  sections: { requirement_number: string; requirement_title: string; requirement_description: string | null; research_data: Record<string, unknown> | null; draft_content: Record<string, unknown> | null }[]
) {
  const doc = new jsPDF();
  const maxW = 170;
  let y = 20;

  doc.setFontSize(16);
  y = addWrappedText(doc, project.title, 20, y, maxW, 8);
  y += 4;

  doc.setFontSize(9);
  doc.setTextColor(120);
  y = addWrappedText(doc, `Model: ${project.model} | Stage: ${project.current_stage} | Created: ${new Date(project.created_at).toLocaleString("ko-KR")}`, 20, y, maxW, 5);
  doc.setTextColor(0);
  y += 8;

  // Sections
  for (const sec of sections) {
    doc.setFontSize(11);
    y = addWrappedText(doc, `[${sec.requirement_number}] ${sec.requirement_title}`, 20, y, maxW, 6);
    y += 2;
    doc.setFontSize(8);
    if (sec.requirement_description) {
      y = addWrappedText(doc, sec.requirement_description, 20, y, maxW, 4);
      y += 2;
    }
    if (sec.draft_content) {
      y = addWrappedText(doc, "--- Draft ---", 20, y, maxW, 4);
      y = addWrappedText(doc, jsonToText(sec.draft_content).slice(0, 3000), 20, y, maxW, 4);
    }
    y += 8;
  }

  // Merged doc
  if (project.merged_document) {
    doc.setFontSize(12);
    y = addWrappedText(doc, "Merged Proposal Document", 20, y, maxW, 6);
    y += 2;
    doc.setFontSize(8);
    y = addWrappedText(doc, jsonToText(project.merged_document).slice(0, 5000), 20, y, maxW, 4);
  }

  doc.save(`${project.title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}_제안서.pdf`);
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
  sections: { requirement_number: string; requirement_title: string; requirement_description: string | null; priority: string; research_status: string; draft_status: string; research_data: Record<string, unknown> | null; draft_content: Record<string, unknown> | null }[]
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
    reqRows.push([sec.requirement_number, sec.requirement_title, sec.requirement_description, sec.priority, sec.research_status, sec.draft_status]);
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
