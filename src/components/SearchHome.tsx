import { useState, useEffect } from "react";
import { Search, TrendingUp, Clock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FileType } from "@/lib/types";

const TRENDING_KEYWORDS = ["NIA", "교통사고", "Kubeflow", "품질관리", "eGovFrame", "데이터 표준화", "AI 분석", "스마트시티"];
const RECENT_SEARCHES = ["디지털플랫폼정부", "국가중점데이터", "클라우드 마이그레이션"];

const FILE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pptx", label: "PPT" },
  { value: "pdf", label: "PDF" },
  { value: "xlsx", label: "Excel" },
  { value: "csv", label: "CSV" },
  { value: "ipynb", label: "Notebook" },
];

interface SearchHomeProps {
  onSearch: (query: string, type?: string) => void;
}

export function SearchHome({ onSearch }: SearchHomeProps) {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const handleSearch = () => {
    if (!query.trim()) return;
    onSearch(query, selectedType === "all" ? undefined : selectedType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleKeywordClick = (kw: string) => {
    setQuery(kw);
    onSearch(kw, selectedType === "all" ? undefined : selectedType);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          컨설팅 산출물 통합 검색
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
          Knowledge Wiki
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          PPT · PDF · Excel 내부 텍스트까지 위치와 함께 찾아드립니다
        </p>
      </div>

      {/* Search Bar - DBpia style */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-stretch rounded-xl border-2 border-primary bg-card shadow-lg overflow-hidden">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-24 md:w-28 border-0 border-r rounded-none bg-muted/50 text-sm font-medium h-12 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILE_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="키워드, 기관명, 시스템명, 데이터명 등을 입력하세요."
            className="flex-1 border-0 h-12 text-base px-4 focus-visible:ring-0 bg-transparent"
          />
          <Button
            onClick={handleSearch}
            className="h-12 px-6 rounded-none text-base font-semibold"
          >
            <Search className="h-5 w-5 mr-1.5" />
            검색
          </Button>
        </div>
      </div>

      {/* Keyword Tabs - DBpia style */}
      <div className="w-full max-w-2xl">
        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="bg-transparent border-b rounded-none w-full justify-start gap-0 h-auto p-0">
            <TabsTrigger
              value="trending"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              인기 키워드
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              최근 검색어
            </TabsTrigger>
          </TabsList>
          <TabsContent value="trending" className="mt-4">
            <div className="flex flex-wrap gap-2">
              {TRENDING_KEYWORDS.map((kw, i) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5 text-sm"
                  onClick={() => handleKeywordClick(kw)}
                >
                  <span className="text-primary font-semibold mr-1.5">{i + 1}</span>
                  {kw}
                </Badge>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="recent" className="mt-4">
            <div className="flex flex-wrap gap-2">
              {RECENT_SEARCHES.length === 0 ? (
                <p className="text-sm text-muted-foreground">최근 검색어가 없습니다.</p>
              ) : (
                RECENT_SEARCHES.map((kw) => (
                  <Badge
                    key={kw}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors px-3 py-1.5 text-sm"
                    onClick={() => handleKeywordClick(kw)}
                  >
                    <Clock className="h-3 w-3 mr-1.5 text-muted-foreground" />
                    {kw}
                  </Badge>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Stats Strip */}
      <div className="mt-12 flex items-center gap-8 text-center">
        <div>
          <p className="text-2xl font-bold text-foreground">1,247</p>
          <p className="text-xs text-muted-foreground mt-0.5">총 문서</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <p className="text-2xl font-bold text-foreground">15,832</p>
          <p className="text-xs text-muted-foreground mt-0.5">인덱싱 청크</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <p className="text-2xl font-bold text-foreground">23</p>
          <p className="text-xs text-muted-foreground mt-0.5">프로젝트</p>
        </div>
      </div>
    </div>
  );
}
