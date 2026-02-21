import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Network, FileText, Tag, FolderOpen, Hash } from "lucide-react";
import type { GraphNode, GraphLink, GraphData } from "@/lib/types";

const MOCK_GRAPH: GraphData = {
  nodes: [
    // Projects
    { id: "p1", label: "국가중점데이터", type: "project", val: 8, color: "hsl(var(--primary))" },
    { id: "p2", label: "디지털플랫폼정부", type: "project", val: 6, color: "hsl(var(--primary))" },
    { id: "p3", label: "AI분석플랫폼", type: "project", val: 7, color: "hsl(var(--primary))" },
    { id: "p4", label: "스마트시티", type: "project", val: 5, color: "hsl(var(--primary))" },
    // Documents
    { id: "d1", label: "최종보고.pptx", type: "document", val: 4 },
    { id: "d2", label: "기관현황조사.pdf", type: "document", val: 4 },
    { id: "d3", label: "DPG_제안서_v3.pptx", type: "document", val: 3 },
    { id: "d4", label: "AI플랫폼_제안서.pptx", type: "document", val: 3 },
    { id: "d5", label: "스마트시티_ISP.pptx", type: "document", val: 3 },
    // Keywords
    { id: "k1", label: "데이터", type: "keyword", val: 5 },
    { id: "k2", label: "품질관리", type: "keyword", val: 4 },
    { id: "k3", label: "API", type: "keyword", val: 4 },
    { id: "k4", label: "클라우드", type: "keyword", val: 3 },
    { id: "k5", label: "MLOps", type: "keyword", val: 3 },
    { id: "k6", label: "IoT", type: "keyword", val: 3 },
    { id: "k7", label: "마이크로서비스", type: "keyword", val: 3 },
    // Tags
    { id: "t1", label: "NIA", type: "tag", val: 2 },
    { id: "t2", label: "행정안전부", type: "tag", val: 2 },
    { id: "t3", label: "국토교통부", type: "tag", val: 2 },
  ],
  links: [
    // project-document
    { source: "p1", target: "d1" },
    { source: "p1", target: "d2" },
    { source: "p2", target: "d3" },
    { source: "p3", target: "d4" },
    { source: "p4", target: "d5" },
    // document-keyword
    { source: "d1", target: "k1" },
    { source: "d1", target: "k2" },
    { source: "d2", target: "k1" },
    { source: "d2", target: "k3" },
    { source: "d3", target: "k7" },
    { source: "d3", target: "k3" },
    { source: "d3", target: "k4" },
    { source: "d4", target: "k5" },
    { source: "d5", target: "k6" },
    // keyword-keyword
    { source: "k1", target: "k2", label: "관련" },
    { source: "k3", target: "k7", label: "관련" },
    { source: "k5", target: "k4", label: "관련" },
    // project-tag
    { source: "p1", target: "t1" },
    { source: "p2", target: "t2" },
    { source: "p4", target: "t3" },
  ],
};

const NODE_TYPE_CONFIG: Record<GraphNode["type"], { icon: typeof FileText; label: string; color: string }> = {
  project: { icon: FolderOpen, label: "프로젝트", color: "bg-primary text-primary-foreground" },
  document: { icon: FileText, label: "문서", color: "bg-blue-500 text-white" },
  keyword: { icon: Hash, label: "키워드", color: "bg-amber-500 text-white" },
  tag: { icon: Tag, label: "태그", color: "bg-emerald-500 text-white" },
};

export default function KnowledgeGraphPage() {
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredNodes = useMemo(() => {
    if (filterType === "all") return MOCK_GRAPH.nodes;
    return MOCK_GRAPH.nodes.filter((n) => n.type === filterType);
  }, [filterType]);

  const filteredLinks = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return MOCK_GRAPH.links.filter((l) => nodeIds.has(l.source as string) && nodeIds.has(l.target as string));
  }, [filteredNodes]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    setDetailOpen(true);
  };

  const getConnections = (nodeId: string) => {
    return MOCK_GRAPH.links
      .filter((l) => l.source === nodeId || l.target === nodeId)
      .map((l) => {
        const otherId = l.source === nodeId ? l.target : l.source;
        return MOCK_GRAPH.nodes.find((n) => n.id === otherId);
      })
      .filter(Boolean) as GraphNode[];
  };

  // Simple CSS-based force graph visualization
  const gridCols = Math.ceil(Math.sqrt(filteredNodes.length));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Network className="h-5 w-5" /> 지식 그래프
          </h1>
          <p className="text-sm text-muted-foreground mt-1">문서, 키워드, 프로젝트 간의 관계를 시각화합니다</p>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="project">프로젝트</SelectItem>
            <SelectItem value="document">문서</SelectItem>
            <SelectItem value="keyword">키워드</SelectItem>
            <SelectItem value="tag">태그</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs">
            <div className={`h-3 w-3 rounded-full ${config.color}`} />
            <span>{config.label}</span>
          </div>
        ))}
      </div>

      {/* Graph Area */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 min-h-[400px]" style={{ gridTemplateColumns: `repeat(${Math.min(gridCols, 6)}, 1fr)` }}>
            {filteredNodes.map((node) => {
              const config = NODE_TYPE_CONFIG[node.type];
              const Icon = config.icon;
              const connections = getConnections(node.id).length;
              return (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-all hover:shadow-md hover:border-primary/40 cursor-pointer group"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color} transition-transform group-hover:scale-110`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-center line-clamp-2">{node.label}</span>
                  <Badge variant="outline" className="text-[10px]">{connections} 연결</Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => {
          const count = MOCK_GRAPH.nodes.filter((n) => n.type === type).length;
          const Icon = config.icon;
          return (
            <Card key={type}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-auto">
          {selectedNode && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = NODE_TYPE_CONFIG[selectedNode.type].icon;
                    return <Icon className="h-4 w-4" />;
                  })()}
                  {selectedNode.label}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <Badge className={NODE_TYPE_CONFIG[selectedNode.type].color}>
                  {NODE_TYPE_CONFIG[selectedNode.type].label}
                </Badge>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">연결된 노드</p>
                  <div className="space-y-2">
                    {getConnections(selectedNode.id).map((conn) => {
                      const connConfig = NODE_TYPE_CONFIG[conn.type];
                      const ConnIcon = connConfig.icon;
                      return (
                        <button
                          key={conn.id}
                          onClick={() => { setSelectedNode(conn); }}
                          className="flex items-center gap-2 w-full rounded-md border p-2 text-xs hover:bg-muted transition-colors text-left"
                        >
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full ${connConfig.color}`}>
                            <ConnIcon className="h-3 w-3" />
                          </div>
                          <span className="font-medium">{conn.label}</span>
                          <Badge variant="outline" className="ml-auto text-[10px]">{connConfig.label}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
