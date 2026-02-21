import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export type SupportedFileType = 'pdf' | 'docx' | 'doc' | 'xlsx' | 'xls' | 'hwp' | 'txt';

export interface ParseResult {
  success: boolean;
  content: string;
  fileName: string;
  fileType: SupportedFileType | 'unknown';
  error?: string;
}

export const getFileType = (file: File): SupportedFileType | 'unknown' => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type;

  if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (extension === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (extension === 'doc' || mimeType === 'application/msword') return 'doc';
  if (extension === 'xlsx' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx';
  if (extension === 'xls' || mimeType === 'application/vnd.ms-excel') return 'xls';
  if (extension === 'hwp') return 'hwp';
  if (extension === 'txt' || mimeType === 'text/plain') return 'txt';
  
  return 'unknown';
};

export const parseFile = async (file: File): Promise<ParseResult> => {
  const fileType = getFileType(file);
  
  try {
    switch (fileType) {
      case 'pdf':
        return await parsePDF(file);
      case 'docx':
        return await parseDocx(file);
      case 'xlsx':
      case 'xls':
        return await parseExcel(file);
      case 'txt':
        return await parseTxt(file);
      case 'hwp':
        return {
          success: false,
          content: '',
          fileName: file.name,
          fileType: 'hwp',
          error: 'HWP 파일은 현재 지원되지 않습니다. 텍스트를 복사하여 붙여넣거나, PDF/DOCX로 변환 후 업로드해주세요.'
        };
      default:
        return {
          success: false,
          content: '',
          fileName: file.name,
          fileType: 'unknown',
          error: '지원되지 않는 파일 형식입니다. PDF, Word, Excel, TXT 파일을 업로드해주세요.'
        };
    }
  } catch (error) {
    console.error('File parsing error:', error);
    return {
      success: false,
      content: '',
      fileName: file.name,
      fileType,
      error: `파일 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    };
  }
};

const parsePDF = async (file: File): Promise<ParseResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  return {
    success: true,
    content: fullText.trim(),
    fileName: file.name,
    fileType: 'pdf'
  };
};

const parseDocx = async (file: File): Promise<ParseResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  
  return {
    success: true,
    content: result.value,
    fileName: file.name,
    fileType: 'docx'
  };
};

const parseExcel = async (file: File): Promise<ParseResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  let fullText = '';
  
  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_txt(worksheet);
    fullText += `[시트: ${sheetName}]\n${sheetData}\n\n`;
  });
  
  return {
    success: true,
    content: fullText.trim(),
    fileName: file.name,
    fileType: file.name.endsWith('.xlsx') ? 'xlsx' : 'xls'
  };
};

const parseTxt = async (file: File): Promise<ParseResult> => {
  const text = await file.text();
  
  return {
    success: true,
    content: text,
    fileName: file.name,
    fileType: 'txt'
  };
};
