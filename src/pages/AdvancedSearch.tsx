import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Trash2, ArrowLeft, CalendarIcon, Info } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AdvancedSearchRow, SearchField, SearchOperator } from "@/lib/types";

const FIELD_OPTIONS: { value: SearchField; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "title", label: "문서명" },
  { value: "project", label: "프로젝트명" },
  { value: "tag", label: "태그" },
  { value: "content", label: "본문" },
];

const OPERATOR_OPTIONS: { value: SearchOperator; label: string; desc: string }[] = [
  { value: "AND", label: "AND", desc: "모두 포함" },
  { value: "OR", label: "OR", desc: "하나 이상 포함" },
  { value: "NOT", label: "NOT", desc: "제외" },
];

function createRow(): AdvancedSearchRow {
  return { id: crypto.randomUUID(), field: "all", operator: "AND", keyword: "" };
}

export default function AdvancedSearch() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdvancedSearchRow[]>([createRow()]);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const updateRow = (id: string, patch: Partial<AdvancedSearchRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, createRow()]);

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSearch = () => {
    const parts = rows
      .filter((r) => r.keyword.trim())
      .map((r, i) => {
        const prefix = i === 0 ? "" : ` ${r.operator} `;
        const fieldPrefix = r.field !== "all" ? `${r.field}:` : "";
        return `${prefix}${fieldPrefix}${r.keyword}`;
      });
    const query = parts.join("").trim();
    if (!query) return;
    navigate(`/?q=${encodeURIComponent(query)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}>
        <ArrowLeft className="mr-1 h-4 w-4" /> 검색 홈
      </Button>

      <h1 className="text-xl font-bold mb-1">상세 검색</h1>
      <p className="text-sm text-muted-foreground mb-6">AND/OR/NOT 조건을 조합하여 정밀하게 검색합니다.</p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" /> 검색 조건
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row, idx) => (
            <div key={row.id} className="flex items-center gap-2 flex-wrap">
              {idx > 0 ? (
                <Select value={row.operator} onValueChange={(v) => updateRow(row.id, { operator: v as SearchOperator })}>
                  <SelectTrigger className="w-20 h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATOR_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="font-semibold">{o.label}</span>
                        <span className="text-muted-foreground ml-1 text-xs">({o.desc})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="w-20 flex items-center justify-center">
                  <Badge variant="secondary" className="text-xs">조건 1</Badge>
                </div>
              )}

              <Select value={row.field} onValueChange={(v) => updateRow(row.id, { field: v as SearchField })}>
                <SelectTrigger className="w-28 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={row.keyword}
                onChange={(e) => updateRow(row.id, { keyword: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder="키워드 입력"
                className="flex-1 h-9 min-w-[160px]"
              />

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addRow} className="mt-2">
            <Plus className="mr-1 h-3.5 w-3.5" /> 조건 추가
          </Button>

          <Separator className="my-4" />

          {/* Date Range */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /> 날짜 범위
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-36 justify-start text-left text-xs", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateFrom ? format(dateFrom, "yyyy-MM-dd") : "시작일"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">~</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-36 justify-start text-left text-xs", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateTo ? format(dateTo, "yyyy-MM-dd") : "종료일"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                  초기화
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center gap-2">
            <Button onClick={handleSearch} className="px-6">
              <Search className="mr-1 h-4 w-4" /> 검색
            </Button>
            <Button variant="outline" onClick={() => { setRows([createRow()]); setDateFrom(undefined); setDateTo(undefined); }}>
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Guide */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Info className="h-3 w-3" /> 검색식 안내
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-muted/50 rounded-md p-2">
              <Badge variant="secondary" className="text-xs mb-1">AND</Badge>
              <p className="text-muted-foreground">두 키워드 모두 포함된 결과</p>
              <p className="font-mono mt-1 text-foreground">데이터 AND 품질</p>
            </div>
            <div className="bg-muted/50 rounded-md p-2">
              <Badge variant="secondary" className="text-xs mb-1">OR</Badge>
              <p className="text-muted-foreground">하나 이상 포함된 결과</p>
              <p className="font-mono mt-1 text-foreground">Kubeflow OR MLflow</p>
            </div>
            <div className="bg-muted/50 rounded-md p-2">
              <Badge variant="secondary" className="text-xs mb-1">NOT</Badge>
              <p className="text-muted-foreground">특정 키워드 제외</p>
              <p className="font-mono mt-1 text-foreground">AI NOT GPT</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
