import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface SaveAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string) => Promise<boolean>;
}

const SaveAnalysisDialog = ({ open, onOpenChange, onSave }: SaveAnalysisDialogProps) => {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const success = await onSave(title.trim());
    setLoading(false);
    if (success) { setTitle(""); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>분석 결과 저장</DialogTitle>
          <DialogDescription>분석 결과에 이름을 지정하여 저장합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="analysis-title">제목</Label>
            <Input id="analysis-title" placeholder="예: 2024년 스마트시티 RFP 분석" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSave} disabled={loading || !title.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveAnalysisDialog;
