import { SavedAnalysis } from "../hooks/useSavedAnalyses";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface SavedAnalysesListProps {
  analyses: SavedAnalysis[];
  loading: boolean;
  onLoad: (analysis: SavedAnalysis) => void;
  onDelete: (id: string) => void;
}

const SavedAnalysesList = ({ analyses, loading, onLoad, onDelete }: SavedAnalysesListProps) => {
  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>저장된 분석 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {analyses.map((analysis) => (
        <Card key={analysis.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">{analysis.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(analysis.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{analysis.rfp_content.substring(0, 100)}...</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => onLoad(analysis)}>불러오기</Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(analysis.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default SavedAnalysesList;
