import { useState, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Play, Loader2, File, X, AlertCircle } from "lucide-react";
import { parseFile, getFileType } from "../lib/fileParser";
import { useToast } from "@/hooks/use-toast";
import ModelSelector from "./ModelSelector";

interface RfpInputProps {
  onSubmit: (content: string) => void;
  isProcessing: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  content: string;
  status: 'parsing' | 'success' | 'error';
  error?: string;
}

const RfpInput = ({ onSubmit, isProcessing, selectedModel, onModelChange }: RfpInputProps) => {
  const [rfpContent, setRfpContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (rfpContent.trim()) {
      onSubmit(rfpContent);
    }
  };

  const updateCombinedContent = useCallback((files: UploadedFile[]) => {
    const successfulFiles = files.filter(f => f.status === 'success');
    if (successfulFiles.length === 0) {
      setRfpContent("");
      return;
    }
    const combined = successfulFiles
      .map(f => `[파일: ${f.name}]\n${f.content}`)
      .join('\n\n---\n\n');
    setRfpContent(combined);
  }, []);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    const newFiles: UploadedFile[] = fileArray.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: getFileType(file),
      content: '',
      status: 'parsing' as const,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const fileId = newFiles[i].id;
      const fileType = getFileType(file);

      if (fileType === 'unknown') {
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId 
            ? { ...f, status: 'error' as const, error: '지원되지 않는 파일 형식입니다.' }
            : f
          )
        );
        continue;
      }

      try {
        const result = await parseFile(file);

        setUploadedFiles(prev => {
          const updated = prev.map(f => f.id === fileId 
            ? { 
                ...f, 
                status: result.success ? 'success' as const : 'error' as const,
                content: result.content,
                error: result.error
              }
            : f
          );
          setTimeout(() => updateCombinedContent(updated), 0);
          return updated;
        });

        if (result.success) {
          toast({
            title: "파일 업로드 완료",
            description: `${file.name} 파일의 내용을 추출했습니다.`,
          });
        } else {
          toast({
            title: "파일 처리 실패",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch {
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId 
            ? { ...f, status: 'error' as const, error: '파일 처리 중 오류가 발생했습니다.' }
            : f
          )
        );
      }
    }
  }, [toast, updateCombinedContent]);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      setTimeout(() => updateCombinedContent(updated), 0);
      return updated;
    });
  }, [updateCombinedContent]);

  const clearAllFiles = useCallback(() => {
    setUploadedFiles([]);
    setRfpContent("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isParsing = uploadedFiles.some(f => f.status === 'parsing');

  return (
    <div className="bg-card border border-border rounded-lg p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">제안요청서(RFP) 입력</h2>
          <p className="text-sm text-muted-foreground">파일을 업로드하거나 텍스트를 직접 입력하세요</p>
        </div>
        {uploadedFiles.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFiles} className="text-muted-foreground hover:text-destructive">
            <X className="w-4 h-4 mr-1" />
            전체 삭제
          </Button>
        )}
      </div>

      <div
        className={`relative mb-4 border-2 border-dashed rounded-lg p-6 transition-all ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.hwp"
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isParsing}
          multiple
        />
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">파일을 드래그하거나 클릭하여 업로드</p>
            <p className="text-sm text-muted-foreground mt-1">PDF, Word(.docx), Excel(.xlsx, .xls), TXT 지원 · 여러 파일 동시 업로드 가능</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <AlertCircle className="w-3 h-3" />
            <span>HWP 파일은 PDF로 변환 후 업로드해주세요</span>
          </div>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground mb-2">업로드된 파일 ({uploadedFiles.length}개)</p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  file.status === 'error' ? 'border-destructive/30 bg-destructive/5' 
                  : file.status === 'parsing' ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                    file.status === 'error' ? 'bg-destructive/10' : 'bg-primary/10'
                  }`}>
                    {file.status === 'parsing' ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : file.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <File className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm truncate">{file.name}</p>
                    <p className={`text-xs ${file.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {file.status === 'parsing' && '분석 중...'}
                      {file.status === 'success' && `${file.type.toUpperCase()} · ${file.content.length.toLocaleString()}자`}
                      {file.status === 'error' && file.error}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0 h-8 w-8 p-0" disabled={file.status === 'parsing'}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-0 right-0 top-0 flex items-center justify-center">
          <span className="px-3 py-1 text-xs text-muted-foreground bg-card -mt-3">또는 직접 입력</span>
        </div>
      </div>

      <Textarea
        placeholder={`제안요청서(RFP) 내용을 여기에 붙여넣으세요...\n\n예시:\n- 사업명: ○○○ 정보시스템 구축 ISP 수립\n- 사업기간: 2025.03 ~ 2025.08 (6개월)\n- 사업예산: 000백만원`}
        value={rfpContent}
        onChange={(e) => setRfpContent(e.target.value)}
        className="min-h-[200px] font-normal leading-relaxed border-2 border-border/50 focus:border-primary/50 bg-card resize-none mb-4 mt-4"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>{rfpContent.length.toLocaleString()}자 입력됨</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-64">
            <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} disabled={isProcessing || isParsing} />
          </div>
          <Button onClick={handleSubmit} disabled={!rfpContent.trim() || isProcessing || isParsing} className="gap-2 whitespace-nowrap">
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />분석 중...</>
            ) : (
              <><Play className="w-4 h-4" />AI 분석 시작</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RfpInput;
