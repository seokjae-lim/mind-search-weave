import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, ChevronRight, ChevronDown, File, Search, LayoutGrid, GitBranchPlus, ChevronsUpDown, ChevronsDownUp, Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { projects as apiProjects, browse as apiBrowse } from "@/lib/wikiApi";
import type { WikiChunk } from "@/lib/wikiApi";
import type { FolderNode, BrowseFile } from "@/lib/types";
import { FileTypeIcon } from "@/components/FileTypeIcon";
import { Badge } from "@/components/ui/badge";
import { MindMap } from "@/components/MindMap";
import { KnowledgeGraphEmbed } from "@/components/KnowledgeGraphEmbed";

// Build FolderNode tree from project list + browse results
function buildTreeFromProjects(projectList: { project_path: string; chunk_count: number; file_count: number }[]): FolderNode {
  const root: FolderNode = { name: "컨설팅산출물", path: "", children: [], file_count: 0 };
  projectList.forEach((p) => {
    root.children.push({
      name: p.project_path,
      path: p.project_path,
      children: [],
      file_count: p.file_count,
    });
  });
  return root;
}

function chunkToBrowseFile(c: WikiChunk): BrowseFile {
  return {
    file_path: c.file_path,
    file_type: c.file_type as any,
    doc_title: c.doc_title,
    chunk_count: 1,
    mtime: c.mtime,
    project_path: c.project_path,
  };
}

// Deduplicate files by file_path, summing chunk counts
function deduplicateFiles(chunks: WikiChunk[]): BrowseFile[] {
  const map = new Map<string, BrowseFile>();
  chunks.forEach((c) => {
    const existing = map.get(c.file_path);
    if (existing) {
      existing.chunk_count += 1;
    } else {
      map.set(c.file_path, chunkToBrowseFile(c));
    }
  });
  return Array.from(map.values());
}

export default function BrowsePage() {
  const [tree, setTree] = useState<FolderNode | null>(null);
  const [files, setFiles] = useState<BrowseFile[]>([]);
  const [allFiles, setAllFiles] = useState<BrowseFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [scopedSearch, setScopedSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "mindmap" | "knowledge-graph">("tree");
  const [treeExpandAll, setTreeExpandAll] = useState<boolean | null>(null);
  const [allFilesLoaded, setAllFilesLoaded] = useState(false);
  const navigate = useNavigate();

  // Load projects tree
  useEffect(() => {
    apiProjects().then((res) => {
      const t = buildTreeFromProjects(res.projects);
      setTree(t);
    }).catch(() => {});
  }, []);

  // When mindmap tab is selected, fetch files for all projects so the map has data
  useEffect(() => {
    if (viewMode === "mindmap" && !allFilesLoaded && tree) {
      const fetchAll = async () => {
        try {
          const res = await apiBrowse({ limit: 200, sort: "views" });
          setAllFiles(deduplicateFiles(res.results));
          setAllFilesLoaded(true);
        } catch {
          setAllFiles([]);
        }
      };
      fetchAll();
    }
  }, [viewMode, allFilesLoaded, tree]);

  const selectFolder = async (path: string) => {
    setSelectedPath(path);
    try {
      const res = await apiBrowse({ project: path || undefined, limit: 100 });
      setFiles(deduplicateFiles(res.results));
    } catch {
      setFiles([]);
    }
  };

  const doScopedSearch = () => {
    if (!searchQuery.trim()) return;
    const params = new URLSearchParams({ q: searchQuery });
    if (scopedSearch && selectedPath) params.set("path", selectedPath);
    navigate(`/?${params}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* View mode tabs */}
      <div className="border-b bg-background px-4 pt-3 pb-0">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "tree" | "mindmap" | "knowledge-graph")}>
          <TabsList className="bg-transparent h-auto p-0 gap-0">
            <TabsTrigger value="tree" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" /> 폴더 탐색
            </TabsTrigger>
            <TabsTrigger value="mindmap" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
              <GitBranchPlus className="h-3.5 w-3.5 mr-1.5" /> 마인드맵
            </TabsTrigger>
            <TabsTrigger value="knowledge-graph" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
              <Network className="h-3.5 w-3.5 mr-1.5" /> 지식 그래프
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "tree" ? (
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-72 shrink-0 border-r bg-card overflow-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" /> 폴더 탐색
                </h2>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="전체 펼치기" onClick={() => setTreeExpandAll(true)}>
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="전체 접기" onClick={() => setTreeExpandAll(false)}>
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {tree && <TreeNode node={tree} selectedPath={selectedPath} onSelect={selectFolder} depth={0} expandAll={treeExpandAll} onExpandHandled={() => setTreeExpandAll(null)} />}
            </div>
          </aside>

          <div className="flex-1 overflow-auto">
            <div className="border-b bg-background/95 backdrop-blur p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doScopedSearch()} placeholder="키워드 검색..." className="pl-9" />
                </div>
                <Button size="sm" onClick={doScopedSearch}>검색</Button>
                {selectedPath && (
                  <div className="flex items-center gap-2">
                    <Switch id="scoped" checked={scopedSearch} onCheckedChange={setScopedSearch} />
                    <Label htmlFor="scoped" className="text-xs text-muted-foreground whitespace-nowrap">이 폴더 내 검색</Label>
                  </div>
                )}
              </div>
              {selectedPath && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <FolderOpen className="h-3 w-3" />
                  <span>{selectedPath || "전체"}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">{files.length}개 파일</Badge>
                </div>
              )}
            </div>

            <div className="p-4">
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">폴더를 선택하세요</p>
              ) : (
                <div className="space-y-2">
                  {files.map((f) => (
                    <Card key={f.file_path} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/doc/${encodeURIComponent(f.file_path)}`)}>
                      <CardContent className="flex items-center gap-3 p-3">
                        <FileTypeIcon type={f.file_type} className="h-5 w-5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.doc_title}</p>
                          <p className="text-xs text-muted-foreground truncate">{f.file_path}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{f.chunk_count} chunks</p>
                          <p className="text-xs text-muted-foreground">{new Date(f.mtime).toLocaleDateString("ko-KR")}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : viewMode === "mindmap" ? (
        <div className="flex-1 overflow-hidden bg-[hsl(222,47%,6%)] rounded-b-xl">
          {tree && <MindMap tree={tree} files={allFiles.length > 0 ? allFiles : files} />}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <KnowledgeGraphEmbed showHeader={false} />
        </div>
      )}
    </div>
  );
}

function TreeNode({ node, selectedPath, onSelect, depth, expandAll, onExpandHandled }: { node: FolderNode; selectedPath: string; onSelect: (p: string) => void; depth: number; expandAll?: boolean | null; onExpandHandled?: () => void }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedPath === node.path;

  useEffect(() => {
    if (expandAll === true) { setOpen(true); onExpandHandled?.(); }
    else if (expandAll === false) { if (depth > 0) setOpen(false); onExpandHandled?.(); }
  }, [expandAll]);

  return (
    <div>
      <button
        className={`flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors ${isSelected ? "bg-accent text-accent-foreground font-medium" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => { if (hasChildren) setOpen(!open); onSelect(node.path); }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <span className="truncate">{node.name}</span>
        {node.file_count > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{node.file_count}</span>
        )}
      </button>
      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} expandAll={expandAll} onExpandHandled={onExpandHandled} />
          ))}
        </div>
      )}
    </div>
  );
}
