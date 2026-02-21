import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Network, FileText, Tag, FolderOpen, Hash, Building2, Database, Lightbulb,
  Layers, MonitorSmartphone, ZoomIn, ZoomOut, Maximize, Search, X, ChevronUp, ChevronDown,
} from "lucide-react";
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

const NODE_FILE_MAP: Record<string, string> = {
  d1: "국가중점데이터/03.제안서/최종본/최종보고.pptx",
  d2: "국가중점데이터/04.수행/현황분석/기관현황조사.pdf",
  d3: "디지털플랫폼정부/02.제안서/DPG_제안서_v3.pptx",
  d4: "AI분석플랫폼/03.제안서/AI플랫폼_제안서.pptx",
  d5: "스마트시티/03.제안서/스마트시티_ISP_최종.pptx",
};

// ─── Mock graph data ───
const MOCK_GRAPH: GraphData = {
  nodes: [
    { id: "p1", label: "국가중점데이터", type: "project", val: 10 },
    { id: "p2", label: "디지털플랫폼정부", type: "project", val: 8 },
    { id: "p3", label: "AI분석플랫폼", type: "project", val: 9 },
    { id: "p4", label: "스마트시티", type: "project", val: 7 },
    { id: "d1", label: "최종보고.pptx", type: "document", val: 5 },
    { id: "d2", label: "기관현황조사.pdf", type: "document", val: 5 },
    { id: "d3", label: "DPG_제안서_v3.pptx", type: "document", val: 4 },
    { id: "d4", label: "AI플랫폼_제안서.pptx", type: "document", val: 4 },
    { id: "d5", label: "스마트시티_ISP.pptx", type: "document", val: 4 },
    { id: "i1", label: "NIA", type: "institution", val: 6 },
    { id: "i2", label: "행정안전부", type: "institution", val: 6 },
    { id: "i3", label: "국토교통부", type: "institution", val: 5 },
    { id: "s1", label: "데이터포털", type: "system", val: 4 },
    { id: "s2", label: "클라우드플랫폼", type: "system", val: 4 },
    { id: "st1", label: "데이터품질관리", type: "strategy", val: 5 },
    { id: "st2", label: "마이크로서비스아키텍처", type: "strategy", val: 4 },
    { id: "st3", label: "MLOps파이프라인", type: "strategy", val: 4 },
    { id: "ds1", label: "공공데이터API", type: "dataset", val: 4 },
    { id: "ds2", label: "IoT센서데이터", type: "dataset", val: 3 },
    { id: "k1", label: "데이터", type: "keyword", val: 6 },
    { id: "k2", label: "API", type: "keyword", val: 5 },
    { id: "k3", label: "클라우드", type: "keyword", val: 4 },
  ],
  links: [
    { source: "p1", target: "d1", type: "HAS_DOCUMENT" },
    { source: "p1", target: "d2", type: "HAS_DOCUMENT" },
    { source: "p2", target: "d3", type: "HAS_DOCUMENT" },
    { source: "p3", target: "d4", type: "HAS_DOCUMENT" },
    { source: "p4", target: "d5", type: "HAS_DOCUMENT" },
    { source: "p1", target: "i1", type: "BELONGS_TO" },
    { source: "p2", target: "i2", type: "BELONGS_TO" },
    { source: "p4", target: "i3", type: "BELONGS_TO" },
    { source: "d1", target: "st1", type: "APPLIES_STRATEGY" },
    { source: "d3", target: "st2", type: "APPLIES_STRATEGY" },
    { source: "d4", target: "st3", type: "APPLIES_STRATEGY" },
    { source: "d1", target: "s1", type: "MENTIONS" },
    { source: "d3", target: "s2", type: "MENTIONS" },
    { source: "d2", target: "ds1", type: "GENERATED_FROM" },
    { source: "d5", target: "ds2", type: "GENERATED_FROM" },
    { source: "d1", target: "k1", type: "MENTIONS" },
    { source: "d2", target: "k2", type: "MENTIONS" },
    { source: "d3", target: "k3", type: "MENTIONS" },
    { source: "st1", target: "st2", type: "RELATED_TO" },
    { source: "st2", target: "st3", type: "RELATED_TO" },
    { source: "k1", target: "ds1", type: "RELATED_TO" },
    { source: "k2", target: "ds1", type: "RELATED_TO" },
  ],
};

// ─── Minimap Component ───
const MINIMAP_W = 180;
const MINIMAP_H = 120;

function Minimap({ fgRef, graphData }: { fgRef: React.RefObject<any>; graphData: GraphData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const fg = fgRef.current;
    if (!canvas || !fg) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_W * dpr;
    canvas.height = MINIMAP_H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
    ctx.fillStyle = "hsl(222, 47%, 8%)";
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

    // Get all node positions from force graph internal state
    const nodes = graphData.nodes as any[];
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n: any) => {
      if (n.x == null || n.y == null) return;
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });

    if (!isFinite(minX)) return;
    const pad = 40;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const worldW = Math.max(maxX - minX, 1);
    const worldH = Math.max(maxY - minY, 1);
    const scale = Math.min((MINIMAP_W - 10) / worldW, (MINIMAP_H - 10) / worldH);
    const offX = (MINIMAP_W - worldW * scale) / 2;
    const offY = (MINIMAP_H - worldH * scale) / 2;

    const toMini = (wx: number, wy: number) => ({
      mx: (wx - minX) * scale + offX,
      my: (wy - minY) * scale + offY,
    });

    // Edges
    ctx.lineWidth = 0.5;
    (graphData.links as any[]).forEach((l: any) => {
      const s = typeof l.source === "object" ? l.source : nodes.find((n: any) => n.id === l.source);
      const t = typeof l.target === "object" ? l.target : nodes.find((n: any) => n.id === l.target);
      if (!s?.x || !t?.x) return;
      const p1 = toMini(s.x, s.y);
      const p2 = toMini(t.x, t.y);
      ctx.beginPath();
      ctx.moveTo(p1.mx, p1.my);
      ctx.lineTo(p2.mx, p2.my);
      ctx.strokeStyle = "rgba(100,116,139,0.3)";
      ctx.stroke();
    });

    // Nodes as dots
    nodes.forEach((n: any) => {
      if (n.x == null) return;
      const { mx, my } = toMini(n.x, n.y);
      const cfg = NODE_CONFIG[n.type as GraphNodeType];
      ctx.beginPath();
      ctx.arc(mx, my, 2, 0, Math.PI * 2);
      ctx.fillStyle = cfg?.bg || "#888";
      ctx.fill();
    });

    // Viewport rect
    try {
      const center = fg.centerAt?.();
      const zoomLevel = fg.zoom?.();
      if (center && zoomLevel) {
        // approximate viewport
        const container = fg.graph?.().renderer?.domElement?.parentNode || fg._containerEl;
        const cw = container?.clientWidth || 800;
        const ch = container?.clientHeight || 500;
        const vpW = cw / zoomLevel;
        const vpH = ch / zoomLevel;
        const vpLeft = (center[0] || 0) - vpW / 2;
        const vpTop = (center[1] || 0) - vpH / 2;
        const vp1 = toMini(vpLeft, vpTop);
        const vp2 = toMini(vpLeft + vpW, vpTop + vpH);
        ctx.strokeStyle = "hsl(45, 100%, 60%)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(vp1.mx, vp1.my, vp2.mx - vp1.mx, vp2.my - vp1.my);
      }
    } catch {
      // viewport rect is best-effort
    }

    animRef.current = requestAnimationFrame(draw);
  }, [fgRef, graphData]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleClick = (e: React.MouseEvent) => {
    const fg = fgRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!fg || !rect) return;

    const nodes = graphData.nodes as any[];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n: any) => {
      if (n.x == null) return;
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });
    if (!isFinite(minX)) return;
    const pad = 40;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const worldW = Math.max(maxX - minX, 1);
    const worldH = Math.max(maxY - minY, 1);
    const scale = Math.min((MINIMAP_W - 10) / worldW, (MINIMAP_H - 10) / worldH);
    const offX = (MINIMAP_W - worldW * scale) / 2;
    const offY = (MINIMAP_H - worldH * scale) / 2;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldClickX = (clickX - offX) / scale + minX;
    const worldClickY = (clickY - offY) / scale + minY;

    fg.centerAt(worldClickX, worldClickY, 300);
  };

  return (
    <div className="absolute bottom-3 right-3 z-10 rounded-lg overflow-hidden border border-border shadow-lg bg-background/90 backdrop-blur-sm">
      <canvas
        ref={canvasRef}
        style={{ width: MINIMAP_W, height: MINIMAP_H, cursor: "crosshair" }}
        onClick={handleClick}
      />
    </div>
  );
}

// ─── Main Component ───
export default function KnowledgeGraphPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: any } | null>(null);

  // Responsive sizing
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(500, window.innerHeight - 200),
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

  // ─── Search ───
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setHighlightedIds(new Set());
      setActiveResultIndex(0);
      return;
    }
    const q = query.toLowerCase();
    const matches = MOCK_GRAPH.nodes
      .filter((n) => n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q))
      .map((n) => n.id);
    setSearchResults(matches);
    setActiveResultIndex(0);
    if (matches.length > 0) {
      focusOnNode(matches[0]);
      setHighlightedIds(new Set(matches));
    } else {
      setHighlightedIds(new Set());
    }
  }, []);

  const focusOnNode = useCallback((nodeId: string) => {
    const fg = fgRef.current;
    if (!fg) return;
    const node = (graphData.nodes as any[]).find((n: any) => n.id === nodeId);
    if (node && node.x != null) {
      fg.centerAt(node.x, node.y, 400);
      fg.zoom(3, 400);
    }
    // Highlight connected nodes
    const connected = new Set<string>([nodeId]);
    MOCK_GRAPH.links.forEach((l) => {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (s === nodeId) connected.add(t);
      if (t === nodeId) connected.add(s);
    });
    setHighlightedIds(connected);
  }, [graphData]);

  const goToResult = useCallback((index: number) => {
    if (searchResults.length === 0) return;
    const i = ((index % searchResults.length) + searchResults.length) % searchResults.length;
    setActiveResultIndex(i);
    focusOnNode(searchResults[i]);
  }, [searchResults, focusOnNode]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setHighlightedIds(new Set());
    setActiveResultIndex(0);
  }, []);

  // ─── Custom node renderer ───
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const cfg = NODE_CONFIG[node.type as GraphNodeType];
    if (!cfg) return;
    const size = (node.val || 4) * 1.5;
    const isHovered = hoveredNode === node.id;
    const isConnected = connectedIds.has(node.id);
    const isHighlighted = highlightedIds.has(node.id);
    const isActiveResult = searchResults.length > 0 && searchResults[activeResultIndex] === node.id;
    const dimmed = hoveredNode && !isConnected;

    // Glow
    if (isHovered || isActiveResult) {
      ctx.shadowColor = isActiveResult ? "hsl(45, 100%, 60%)" : cfg.bg;
      ctx.shadowBlur = isActiveResult ? 20 : 15;
    }

    // Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = isActiveResult
      ? "hsl(45, 90%, 45%)"
      : dimmed ? `${cfg.bg}33` : cfg.bg;
    ctx.fill();

    // Border
    ctx.strokeStyle = isActiveResult
      ? "hsl(45, 100%, 70%)"
      : isHighlighted
        ? "hsl(45, 100%, 60%)"
        : isHovered ? "#fff" : dimmed ? `${cfg.bg}22` : `${cfg.bg}88`;
    ctx.lineWidth = isActiveResult ? 3 / globalScale : isHighlighted ? 2 / globalScale : isHovered ? 2 : 0.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Label
    if (globalScale > 1.2 || isHovered || isConnected || isHighlighted || isActiveResult) {
      const fontSize = Math.max(10 / globalScale, 2.5);
      ctx.font = `${isHovered || isActiveResult ? "bold " : ""}${fontSize}px -apple-system, "Pretendard", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = dimmed ? "#99999966" : "#e2e8f0";
      ctx.fillText(node.label, node.x, node.y + size + 2);
    }
  }, [hoveredNode, connectedIds, highlightedIds, searchResults, activeResultIndex]);

  // ─── Edge renderer ───
  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const s = link.source;
    const t = link.target;
    if (!s || !t || typeof s.x === "undefined") return;

    const sId = s.id || s;
    const tId = t.id || t;
    const isHighlighted = hoveredNode && (connectedIds.has(sId) && connectedIds.has(tId));
    const isSearchHighlighted = highlightedIds.has(sId) && highlightedIds.has(tId);
    const dimmed = hoveredNode && !isHighlighted;

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.strokeStyle = isSearchHighlighted
      ? "hsl(45, 100%, 60%)"
      : dimmed ? "rgba(100,100,100,0.05)" : isHighlighted ? "rgba(200,200,255,0.6)" : "rgba(100,116,139,0.2)";
    ctx.lineWidth = isSearchHighlighted ? 2 / globalScale : isHighlighted ? 1.5 / globalScale : 0.5 / globalScale;
    ctx.stroke();

    if (globalScale > 2 && link.type && !dimmed) {
      const midX = (s.x + t.x) / 2;
      const midY = (s.y + t.y) / 2;
      const fontSize = Math.max(8 / globalScale, 2);
      ctx.font = `${fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isHighlighted || isSearchHighlighted ? "rgba(200,200,255,0.8)" : "rgba(148,163,184,0.5)";
      ctx.fillText(EDGE_LABELS[link.type as GraphEdgeType] || link.type, midX, midY);
    }
  }, [hoveredNode, connectedIds, highlightedIds]);

  // ─── Context menu handler ───
  const handleContextMenu = useCallback((node: any, event: MouseEvent) => {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setContextMenu({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      node,
    });
  }, []);

  // ─── Hover with tooltip position ───
  const handleNodeHover = useCallback((node: any, prevNode: any) => {
    setHoveredNode(node?.id || null);
    if (node) {
      // convert graph coords to screen coords
      const fg = fgRef.current;
      if (fg) {
        const pos = fg.graph2ScreenCoords(node.x, node.y);
        setTooltipPos({ x: pos.x, y: pos.y });
      }
    } else {
      setTooltipPos(null);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Network className="h-5 w-5" /> 지식 그래프
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              프로젝트 · 문서 · 기관 · 전략 · 데이터셋 간의 온톨로지 관계를 탐색합니다
            </p>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 h-8 text-xs">
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
        </div>
      </div>

      {/* Graph container */}
      <div className="flex-1 relative overflow-hidden bg-[hsl(222,47%,6%)]" ref={containerRef}>
        {/* Search bar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <div className="relative flex items-center">
            <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="노드 검색..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToResult(activeResultIndex + 1);
                if (e.key === "Escape") clearSearch();
              }}
              className="h-8 w-48 pl-7 pr-7 text-xs bg-background/90 backdrop-blur-sm"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/90 backdrop-blur-sm rounded px-2 py-1.5 border border-border">
              <span className="font-medium">{activeResultIndex + 1}/{searchResults.length}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => goToResult(activeResultIndex - 1)}>
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => goToResult(activeResultIndex + 1)}>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <span className="text-xs text-muted-foreground bg-background/90 backdrop-blur-sm rounded px-2 py-1.5 border border-border">
              결과 없음
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 200)} title="확대">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 0.7, 200)} title="축소">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fgRef.current?.zoomToFit(300, 40)} title="맞춤">
            <Maximize className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-12 left-3 z-10 bg-background/85 backdrop-blur-sm rounded-lg border border-border px-3 py-2">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">노드 타입</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
              <button
                key={type}
                onClick={() => setFilterType(filterType === type ? "all" : type)}
                className={`flex items-center gap-1.5 transition-colors ${filterType === type ? "opacity-100" : "opacity-70 hover:opacity-100"}`}
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: cfg.bg }} />
                <span className="text-[10px] text-muted-foreground">{cfg.icon} {cfg.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground mt-2 mb-1">엣지 타입</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(EDGE_LABELS).map(([, label]) => (
              <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block h-px w-3 bg-muted-foreground/40" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Hint */}
        <div className="absolute bottom-3 left-3 z-10 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1">
          클릭: 상세 보기 · 노드 드래그: 이동 · 빈 곳 드래그: 패닝 · 스크롤: 확대/축소 · 우클릭: 메뉴
        </div>

        {/* Force Graph */}
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
            setContextMenu(null);
            setSelectedNode(node);
            setDetailOpen(true);
          }}
          onNodeHover={handleNodeHover}
          onNodeRightClick={handleContextMenu}
          onBackgroundClick={() => { setContextMenu(null); setHighlightedIds(new Set()); }}
          nodeLabel={() => ""}
          linkDirectionalParticles={0}
          cooldownTicks={80}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          enableNodeDrag={true}
        />

        {/* Minimap */}
        <Minimap fgRef={fgRef} graphData={graphData} />

        {/* Hover Tooltip */}
        {hoveredNode && tooltipPos && !detailOpen && !contextMenu && (() => {
          const node = MOCK_GRAPH.nodes.find((n) => n.id === hoveredNode);
          if (!node) return null;
          const cfg = NODE_CONFIG[node.type];
          const connections = getConnections(node.id);
          const filePath = NODE_FILE_MAP[node.id];
          return (
            <div
              className="absolute z-20 pointer-events-none w-56 rounded-lg border border-border bg-popover/95 backdrop-blur-sm text-popover-foreground shadow-xl px-3 py-2.5 space-y-1 animate-in fade-in-0 duration-150"
              style={{ left: Math.min(tooltipPos.x + 12, dimensions.width - 240), top: Math.max(tooltipPos.y - 80, 8) }}
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: cfg.bg }} />
                <span className="text-xs font-semibold truncate">{node.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {cfg.icon} {cfg.label}
              </p>
              {filePath && (
                <p className="text-[10px] text-muted-foreground truncate" title={filePath}>
                  📂 {filePath}
                </p>
              )}
              <div className="text-[10px] text-muted-foreground">
                🔗 {connections.length}개 연결
              </div>
            </div>
          );
        })()}

        {/* Context Menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
            <div
              className="absolute z-30 min-w-[180px] rounded-lg border border-border bg-popover text-popover-foreground shadow-xl py-1 animate-in fade-in-0 zoom-in-95"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground truncate max-w-[200px]">
                {NODE_CONFIG[contextMenu.node.type as GraphNodeType]?.icon} {contextMenu.node.label}
              </div>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => { focusOnNode(contextMenu.node.id); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                🔍 이 노드로 포커스
              </button>
              <button
                onClick={() => {
                  setSelectedNode(contextMenu.node);
                  setDetailOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                📋 상세 정보 보기
              </button>
              {contextMenu.node.type === "document" && NODE_FILE_MAP[contextMenu.node.id] && (
                <button
                  onClick={() => {
                    navigate(`/doc/${encodeURIComponent(NODE_FILE_MAP[contextMenu.node.id])}`);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  📄 문서 상세 보기
                </button>
              )}
              <button
                onClick={() => {
                  // Highlight connected nodes
                  const connected = new Set<string>([contextMenu.node.id]);
                  MOCK_GRAPH.links.forEach((l) => {
                    const s = typeof l.source === "object" ? (l.source as any).id : l.source;
                    const t = typeof l.target === "object" ? (l.target as any).id : l.target;
                    if (s === contextMenu.node.id) connected.add(t);
                    if (t === contextMenu.node.id) connected.add(s);
                  });
                  setHighlightedIds(connected);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                ✨ 연결 노드 하이라이트
              </button>
            </div>
          </>
        )}
      </div>

      {/* Stats bar */}
      <div className="border-t bg-background px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">통계:</span>
        {Object.entries(NODE_CONFIG).map(([type, cfg]) => {
          const count = MOCK_GRAPH.nodes.filter((n) => n.type === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? "all" : type)}
              className={`flex items-center gap-1 hover:text-foreground transition-colors ${filterType === type ? "text-foreground font-medium" : ""}`}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: cfg.bg }} />
              {cfg.label} {count}
            </button>
          );
        })}
        <span className="ml-auto">🔗 {MOCK_GRAPH.links.length}개 관계</span>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      focusOnNode(selectedNode.id);
                      setDetailOpen(false);
                    }}
                  >
                    🔍 그래프에서 포커스
                  </Button>
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
