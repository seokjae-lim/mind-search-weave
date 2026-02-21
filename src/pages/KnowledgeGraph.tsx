import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Network, FileText, Tag, FolderOpen, Hash, Building2, Database, Lightbulb, Layers, MonitorSmartphone, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";
import type { GraphNode, GraphLink, GraphData, GraphNodeType, GraphEdgeType } from "@/lib/types";

// ─── Node type visual config ───
const NODE_CONFIG: Record<GraphNodeType, { icon: string; label: string; fg: string; bg: string }> = {
  project:     { icon: "📁", label: "프로젝트",  fg: "#fff", bg: "#6366f1" },
  document:    { icon: "📄", label: "문서",      fg: "#fff", bg: "#3b82f6" },
  slide:       { icon: "🖼", label: "슬라이드",  fg: "#fff", bg: "#8b5cf6" },
  institution: { icon: "🏛", label: "기관",      fg: "#fff", bg: "#ec4899" },
  system:      { icon: "🖥", label: "시스템",    fg: "#fff", bg: "#14b8a6" },
  strategy:    { icon: "💡", label: "전략",      fg: "#fff", bg: "#f59e0b" },
  dataset:     { icon: "🗄", label: "데이터셋",  fg: "#fff", bg: "#10b981" },
  keyword:     { icon: "#",  label: "키워드",    fg: "#fff", bg: "#f97316" },
  tag:         { icon: "🏷", label: "태그",      fg: "#fff", bg: "#06b6d4" },
};

const EDGE_LABELS: Record<GraphEdgeType, string> = {
  HAS_DOCUMENT: "산출물",
  MENTIONS: "언급",
  APPLIES_STRATEGY: "전략적용",
  RELATED_TO: "관련",
  GENERATED_FROM: "생성원",
  BELONGS_TO: "소속",
  TAGGED: "태그",
};

// Map node IDs to file paths for navigation
const NODE_FILE_MAP: Record<string, string> = {
  d1: "국가중점데이터/03.제안서/최종본/최종보고.pptx",
  d2: "국가중점데이터/04.수행/현황분석/기관현황조사.pdf",
  d3: "디지털플랫폼정부/02.제안서/DPG_제안서_v3.pptx",
  d4: "AI분석플랫폼/03.제안서/AI플랫폼_제안서.pptx",
  d5: "스마트시티/03.제안서/스마트시티_ISP_최종.pptx",
};

// ─── Mock graph data (expanded ontology) ───
const MOCK_GRAPH: GraphData = {
  nodes: [
    // Projects
    { id: "p1", label: "국가중점데이터", type: "project", val: 10 },
    { id: "p2", label: "디지털플랫폼정부", type: "project", val: 8 },
    { id: "p3", label: "AI분석플랫폼", type: "project", val: 9 },
    { id: "p4", label: "스마트시티", type: "project", val: 7 },
    // Documents
    { id: "d1", label: "최종보고.pptx", type: "document", val: 5 },
    { id: "d2", label: "기관현황조사.pdf", type: "document", val: 5 },
    { id: "d3", label: "DPG_제안서_v3.pptx", type: "document", val: 4 },
    { id: "d4", label: "AI플랫폼_제안서.pptx", type: "document", val: 4 },
    { id: "d5", label: "스마트시티_ISP.pptx", type: "document", val: 4 },
    // Institutions
    { id: "i1", label: "NIA", type: "institution", val: 6 },
    { id: "i2", label: "행정안전부", type: "institution", val: 6 },
    { id: "i3", label: "국토교통부", type: "institution", val: 5 },
    // Systems
    { id: "s1", label: "데이터포털", type: "system", val: 4 },
    { id: "s2", label: "클라우드플랫폼", type: "system", val: 4 },
    // Strategies
    { id: "st1", label: "데이터품질관리", type: "strategy", val: 5 },
    { id: "st2", label: "마이크로서비스아키텍처", type: "strategy", val: 4 },
    { id: "st3", label: "MLOps파이프라인", type: "strategy", val: 4 },
    // Datasets
    { id: "ds1", label: "공공데이터API", type: "dataset", val: 4 },
    { id: "ds2", label: "IoT센서데이터", type: "dataset", val: 3 },
    // Keywords
    { id: "k1", label: "데이터", type: "keyword", val: 6 },
    { id: "k2", label: "API", type: "keyword", val: 5 },
    { id: "k3", label: "클라우드", type: "keyword", val: 4 },
  ],
  links: [
    // Project → Document (HAS_DOCUMENT)
    { source: "p1", target: "d1", type: "HAS_DOCUMENT" },
    { source: "p1", target: "d2", type: "HAS_DOCUMENT" },
    { source: "p2", target: "d3", type: "HAS_DOCUMENT" },
    { source: "p3", target: "d4", type: "HAS_DOCUMENT" },
    { source: "p4", target: "d5", type: "HAS_DOCUMENT" },
    // Project → Institution (BELONGS_TO)
    { source: "p1", target: "i1", type: "BELONGS_TO" },
    { source: "p2", target: "i2", type: "BELONGS_TO" },
    { source: "p4", target: "i3", type: "BELONGS_TO" },
    // Document → Strategy (APPLIES_STRATEGY)
    { source: "d1", target: "st1", type: "APPLIES_STRATEGY" },
    { source: "d3", target: "st2", type: "APPLIES_STRATEGY" },
    { source: "d4", target: "st3", type: "APPLIES_STRATEGY" },
    // Document → System (MENTIONS)
    { source: "d1", target: "s1", type: "MENTIONS" },
    { source: "d3", target: "s2", type: "MENTIONS" },
    // Document → Dataset (GENERATED_FROM)
    { source: "d2", target: "ds1", type: "GENERATED_FROM" },
    { source: "d5", target: "ds2", type: "GENERATED_FROM" },
    // Document → Keyword (MENTIONS)
    { source: "d1", target: "k1", type: "MENTIONS" },
    { source: "d2", target: "k2", type: "MENTIONS" },
    { source: "d3", target: "k3", type: "MENTIONS" },
    // Strategy ↔ Strategy (RELATED_TO)
    { source: "st1", target: "st2", type: "RELATED_TO" },
    { source: "st2", target: "st3", type: "RELATED_TO" },
    // Keyword ↔ Dataset (RELATED_TO)
    { source: "k1", target: "ds1", type: "RELATED_TO" },
    { source: "k2", target: "ds1", type: "RELATED_TO" },
  ],
};

export default function KnowledgeGraphPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Responsive sizing
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(500, window.innerHeight - 320),
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Filtered data
  const graphData = (() => {
    if (filterType === "all") return MOCK_GRAPH;
    const nodes = MOCK_GRAPH.nodes.filter((n) => n.type === filterType);
    const ids = new Set(nodes.map((n) => n.id));
    const links = MOCK_GRAPH.links.filter((l) => ids.has(l.source as string) && ids.has(l.target as string));
    return { nodes, links };
  })();

  // Connected node IDs for hover highlight
  const connectedIds = (() => {
    if (!hoveredNode) return new Set<string>();
    const ids = new Set<string>([hoveredNode]);
    MOCK_GRAPH.links.forEach((l) => {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (s === hoveredNode) ids.add(t);
      if (t === hoveredNode) ids.add(s);
    });
    return ids;
  })();

  const getConnections = (nodeId: string) => {
    return MOCK_GRAPH.links
      .filter((l) => {
        const s = typeof l.source === "object" ? (l.source as any).id : l.source;
        const t = typeof l.target === "object" ? (l.target as any).id : l.target;
        return s === nodeId || t === nodeId;
      })
      .map((l) => {
        const s = typeof l.source === "object" ? (l.source as any).id : l.source;
        const t = typeof l.target === "object" ? (l.target as any).id : l.target;
        const otherId = s === nodeId ? t : s;
        const node = MOCK_GRAPH.nodes.find((n) => n.id === otherId);
        return node ? { node, edgeType: l.type } : null;
      })
      .filter(Boolean) as { node: GraphNode; edgeType?: GraphEdgeType }[];
  };

  // ─── Custom node renderer ───
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const cfg = NODE_CONFIG[node.type as GraphNodeType];
    if (!cfg) return;
    const size = (node.val || 4) * 1.5;
    const isHovered = hoveredNode === node.id;
    const isConnected = connectedIds.has(node.id);
    const dimmed = hoveredNode && !isConnected;

    // Glow for hovered
    if (isHovered) {
      ctx.shadowColor = cfg.bg;
      ctx.shadowBlur = 15;
    }

    // Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = dimmed ? `${cfg.bg}33` : cfg.bg;
    ctx.fill();

    // Border
    ctx.strokeStyle = isHovered ? "#fff" : dimmed ? `${cfg.bg}22` : `${cfg.bg}88`;
    ctx.lineWidth = isHovered ? 2 : 0.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Label (show when zoomed in enough or hovered)
    if (globalScale > 1.2 || isHovered || isConnected) {
      const fontSize = Math.max(10 / globalScale, 2.5);
      ctx.font = `${isHovered ? "bold " : ""}${fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = dimmed ? "#99999966" : "#e2e8f0";
      ctx.fillText(node.label, node.x, node.y + size + 2);
    }
  }, [hoveredNode, connectedIds]);

  // ─── Edge renderer ───
  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const s = link.source;
    const t = link.target;
    if (!s || !t || typeof s.x === "undefined") return;

    const sId = s.id || s;
    const tId = t.id || t;
    const isHighlighted = hoveredNode && (connectedIds.has(sId) && connectedIds.has(tId));
    const dimmed = hoveredNode && !isHighlighted;

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.strokeStyle = dimmed ? "rgba(100,100,100,0.05)" : isHighlighted ? "rgba(200,200,255,0.6)" : "rgba(100,116,139,0.2)";
    ctx.lineWidth = isHighlighted ? 1.5 / globalScale : 0.5 / globalScale;
    ctx.stroke();

    // Edge label when zoomed
    if (globalScale > 2 && link.type && !dimmed) {
      const midX = (s.x + t.x) / 2;
      const midY = (s.y + t.y) / 2;
      const fontSize = Math.max(8 / globalScale, 2);
      ctx.font = `${fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isHighlighted ? "rgba(200,200,255,0.8)" : "rgba(148,163,184,0.5)";
      ctx.fillText(EDGE_LABELS[link.type as GraphEdgeType] || link.type, midX, midY);
    }
  }, [hoveredNode, connectedIds]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Network className="h-5 w-5" /> 지식 그래프
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            프로젝트 · 문서 · 기관 · 전략 · 데이터셋 간의 온톨로지 관계를 탐색합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
                <SelectItem key={type} value={type}>
                  {cfg.icon} {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => fgRef.current?.zoomToFit(300, 40)}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? "all" : type)}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${
              filterType === type ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
            }`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: cfg.bg }} />
            <span>{cfg.label}</span>
          </button>
        ))}
      </div>

      {/* Graph */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-xl" ref={containerRef}>
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="hsl(222 47% 6%)"
            nodeCanvasObject={paintNode}
            linkCanvasObject={paintLink}
            nodeVal={(n: any) => n.val || 4}
            onNodeClick={(node: any) => {
              setSelectedNode(node);
              setDetailOpen(true);
            }}
            onNodeHover={(node: any) => setHoveredNode(node?.id || null)}
            nodeLabel={() => ""}
            linkDirectionalParticles={0}
            cooldownTicks={80}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            enableNodeDrag={true}
          />
        </CardContent>
      </Card>

      {/* Edge type legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
        <span className="font-medium">엣지 타입:</span>
        {Object.entries(EDGE_LABELS).map(([type, label]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="inline-block h-px w-4 bg-muted-foreground/40" />
            {label}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
        {Object.entries(NODE_CONFIG).map(([type, cfg]) => {
          const count = MOCK_GRAPH.nodes.filter((n) => n.type === type).length;
          if (count === 0) return null;
          return (
            <Card key={type} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setFilterType(type)}>
              <CardContent className="flex items-center gap-2 p-3">
                <span className="text-lg">{cfg.icon}</span>
                <div>
                  <p className="text-sm font-bold">{count}</p>
                  <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-auto">
          {selectedNode && (() => {
            const cfg = NODE_CONFIG[selectedNode.type];
            const connections = getConnections(selectedNode.id);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <span>{cfg.icon}</span>
                    {selectedNode.label}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge style={{ background: cfg.bg, color: cfg.fg }}>{cfg.label}</Badge>
                    {selectedNode.type === "document" && NODE_FILE_MAP[selectedNode.id] && (
                      <Button
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          setDetailOpen(false);
                          navigate(`/doc/${encodeURIComponent(NODE_FILE_MAP[selectedNode.id])}`);
                        }}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        문서 상세 보기
                      </Button>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">연결된 노드 ({connections.length})</p>
                    <div className="space-y-1.5">
                      {connections.map(({ node: conn, edgeType }) => {
                        const connCfg = NODE_CONFIG[conn.type];
                        return (
                          <button
                            key={conn.id}
                            onClick={() => setSelectedNode(conn)}
                            className="flex items-center gap-2 w-full rounded-md border p-2 text-xs hover:bg-muted transition-colors text-left"
                          >
                            <span>{connCfg.icon}</span>
                            <span className="font-medium flex-1">{conn.label}</span>
                            {edgeType && (
                              <Badge variant="secondary" className="text-[10px]">
                                {EDGE_LABELS[edgeType] || edgeType}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">{connCfg.label}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
