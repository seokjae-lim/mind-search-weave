import { useState } from "react";
import { Plus, Edit2, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Requirement } from "../hooks/useRequirements";

interface RequirementsListProps {
  requirements: Requirement[];
  selectedRequirement: Requirement | null;
  onSelect: (req: Requirement) => void;
  onAdd: (req: Requirement) => void;
  onUpdate: (index: number, req: Requirement) => void;
  onRemove: (index: number) => void;
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const categoryColors: Record<string, string> = {
  기능: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  비기능: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  성능: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  보안: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  기술: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  관리: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function RequirementsList({
  requirements,
  selectedRequirement,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
}: RequirementsListProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Requirement>({
    requirement_number: "",
    title: "",
    description: "",
    category: "기능",
    priority: "medium",
    source: "",
  });

  const handleAdd = () => {
    if (!formData.requirement_number || !formData.title) return;
    onAdd(formData);
    setFormData({
      requirement_number: "",
      title: "",
      description: "",
      category: "기능",
      priority: "medium",
      source: "",
    });
    setIsAddOpen(false);
  };

  const handleEdit = (index: number) => {
    setFormData(requirements[index]);
    setEditingIndex(index);
    setIsAddOpen(true);
  };

  const handleUpdate = () => {
    if (editingIndex === null) return;
    onUpdate(editingIndex, formData);
    setEditingIndex(null);
    setFormData({
      requirement_number: "",
      title: "",
      description: "",
      category: "기능",
      priority: "medium",
      source: "",
    });
    setIsAddOpen(false);
  };

  const handleClose = () => {
    setIsAddOpen(false);
    setEditingIndex(null);
    setFormData({
      requirement_number: "",
      title: "",
      description: "",
      category: "기능",
      priority: "medium",
      source: "",
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">요구사항 목록</CardTitle>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="w-4 h-4" />
                추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingIndex !== null ? "요구사항 수정" : "요구사항 추가"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>요구사항 번호 *</Label>
                    <Input
                      placeholder="예: CNR-001"
                      value={formData.requirement_number}
                      onChange={(e) => setFormData({ ...formData, requirement_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>카테고리</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="기능">기능</SelectItem>
                        <SelectItem value="비기능">비기능</SelectItem>
                        <SelectItem value="성능">성능</SelectItem>
                        <SelectItem value="보안">보안</SelectItem>
                        <SelectItem value="기술">기술</SelectItem>
                        <SelectItem value="관리">관리</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>제목 *</Label>
                  <Input
                    placeholder="요구사항 제목"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea
                    placeholder="상세 설명"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>우선순위</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">높음</SelectItem>
                        <SelectItem value="medium">보통</SelectItem>
                        <SelectItem value="low">낮음</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>출처</Label>
                    <Input
                      placeholder="예: RFP 3장"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>취소</Button>
                <Button onClick={editingIndex !== null ? handleUpdate : handleAdd}>
                  {editingIndex !== null ? "수정" : "추가"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
        {requirements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>추출된 요구사항이 없습니다.</p>
            <p className="text-sm mt-1">RFP를 업로드하거나 직접 추가하세요.</p>
          </div>
        ) : (
          requirements.map((req, index) => (
            <div
              key={req.requirement_number}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedRequirement?.requirement_number === req.requirement_number
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => onSelect(req)}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 mt-1 text-muted-foreground cursor-grab" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium text-primary">
                      {req.requirement_number}
                    </span>
                    {req.category && (
                      <Badge variant="secondary" className={categoryColors[req.category] || ""}>
                        {req.category}
                      </Badge>
                    )}
                    {req.priority && (
                      <Badge variant="secondary" className={priorityColors[req.priority] || ""}>
                        {req.priority === "high" ? "높음" : req.priority === "low" ? "낮음" : "보통"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm mt-1 line-clamp-2">{req.title}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(index);
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
