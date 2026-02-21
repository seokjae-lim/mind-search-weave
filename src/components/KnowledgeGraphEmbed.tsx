import { useState, useCallback, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, ZoomIn, ZoomOut, Maximize, Search, X, ChevronUp, ChevronDown } from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";
import { tags as apiTags, projects as apiProjects, browse as apiBrowse, parseTags } from "@/lib/wikiApi";
import type { WikiChunk } from "@/lib/wikiApi";
import type { GraphNode, GraphNodeType, GraphEdgeType, GraphData, GraphLink } from "@/lib/types";

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

// Build graph from API data
async function buildGraphFromAPI(): Promise<GraphData> {
  const [projectsRes, tagsRes, browseRes] = await Promise.all([
    apiProjects(),
    apiTags(),
    apiBrowse({ limit: 50, sort: "views" }),
  ]);

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeIds = new Set<string>();

  const addNode = (id: string, label: string, type: GraphNodeType, val = 4) => {
    if (nodeIds.has(id)) return;
    nodeIds.add(id);
    nodes.push({ id, label, type, val });
  };

  // Projects
  projectsRes.projects.forEach((p) => {
    addNode(`p:${p.project_path}`, p.project_path, "project", Math.max(6, Math.min(12, p.file_count)));
  });

  // Top tags as keyword nodes
  const topTags = (tagsRes.tags || []).slice(0, 20);
  topTags.forEach((t) => {
    addNode(`t:${t.tag}`, t.tag, "tag", Math.max(3, Math.min(8, Math.ceil(t.count / 5))));
  });

  // Documents from browse
  const seenFiles = new Set<string>();
  browseRes.results.forEach((chunk: WikiChunk) => {
    if (seenFiles.has(chunk.file_path)) return;
    seenFiles.add(chunk.file_path);
    const docId = `d:${chunk.file_path}`;
    addNode(docId, chunk.doc_title, "document", 5);

    // Link document -> project
    const projId = `p:${chunk.project_path}`;
    if (nodeIds.has(projId)) {
      links.push({ source: projId, target: docId, type: "HAS_DOCUMENT" });
    }

    // Link document -> tags
    const chunkTags = parseTags(chunk.tags);
    chunkTags.forEach((tag) => {
      const tagId = `t:${tag}`;
      if (nodeIds.has(tagId)) {
        links.push({ source: docId, target: tagId, type: "TAGGED" });
      }
    });

    // Extract org if present
    if (chunk.org) {
      const orgId = `o:${chunk.org}`;
      addNode(orgId, chunk.org, "institution", 5);
      links.push({ source: docId, target: orgId, type: "BELONGS_TO" });
    }
  });

  return { nodes, links };
}

// ─── Minimap ───
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

    nodes.forEach((n: any) => {
      if (n.x == null) return;
      const { mx, my } = toMini(n.x, n.y);
      const cfg = NODE_CONFIG[n.type as GraphNodeType];
      ctx.beginPath();
      ctx.arc(mx, my, 2, 0, Math.PI * 2);
      ctx.fillStyle = cfg?.bg || "#888";
      ctx.fill();
    });

    try {
      const center = fg.centerAt?.();
      const zoomLevel = fg.zoom?.();
      if (center && zoomLevel) {
        const container = fg._containerEl;
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
    } catch { /* best-effort */ }

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
      <canvas ref={canvasRef} style={{ width: MINIMAP_W, height: MINIMAP_H, cursor: "crosshair" }} onClick={handleClick} />
    </div>
  );
}

// ─── Exported Embeddable Knowledge Graph ───
export function KnowledgeGraphEmbed({ showHeader = true }: { showHeader?: boolean }) {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: any } | null>(null);

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  // Load graph data from API
  useEffect(() => {
    buildGraphFromAPI()
      .then(setGraphData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        setDimensions({ width: w || 800, height: Math.max(h, isMobile ? 400 : 500) });
      }
    };
    // Delay initial measurement to allow flex layout to resolve
    const timer = setTimeout(update, 50);
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, [isMobile]);

  const filteredData = (() => {
    if (filterType === "all") return graphData;
    const nodes = graphData.nodes.filter((n) => n.type === filterType);
    const ids = new Set(nodes.map((n) => n.id));
    const links = graphData.links.filter((l) => ids.has(l.source as string) && ids.has(l.target as string));
    return { nodes, links };
  })();

  const connectedIds = (() => {
    if (!hoveredNode) return new Set<string>();
    const ids = new Set<string>([hoveredNode]);
    graphData.links.forEach((l) => {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (s === hoveredNode) ids.add(t);
      if (t === hoveredNode) ids.add(s);
    });
    return ids;
  })();

  const getConnections = (nodeId: string) => {
    return graphData.links
      .filter((l) => {
        const s = typeof l.source === "object" ? (l.source as any).id : l.source;
        const t = typeof l.target === "object" ? (l.target as any).id : l.target;
        return s === nodeId || t === nodeId;
      })
      .map((l) => {
        const s = typeof l.source === "object" ? (l.source as any).id : l.source;
        const t = typeof l.target === "object" ? (l.target as any).id : l.target;
        const otherId = s === nodeId ? t : s;
        const node = graphData.nodes.find((n) => n.id === otherId);
        return node ? { node, edgeType: l.type } : null;
      })
      .filter(Boolean) as { node: GraphNode; edgeType?: GraphEdgeType }[];
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setHighlightedIds(new Set());
      setActiveResultIndex(0);
      return;
    }
    const q = query.toLowerCase();
    const matches = graphData.nodes
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
  }, [graphData]);

  const focusOnNode = useCallback((nodeId: string) => {
    const fg = fgRef.current;
    if (!fg) return;
    const node = (filteredData.nodes as any[]).find((n: any) => n.id === nodeId);
    if (node && node.x != null) {
      fg.centerAt(node.x, node.y, 400);
      fg.zoom(3, 400);
    }
    const connected = new Set<string>([nodeId]);
    graphData.links.forEach((l) => {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (s === nodeId) connected.add(t);
      if (t === nodeId) connected.add(s);
    });
    setHighlightedIds(connected);
  }, [filteredData, graphData]);

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

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const cfg = NODE_CONFIG[node.type as GraphNodeType];
    if (!cfg) return;
    const size = (node.val || 4) * 1.5;
    const isHovered = hoveredNode === node.id;
    const isConnected = connectedIds.has(node.id);
    const isHighlighted = highlightedIds.has(node.id);
    const isActiveResult = searchResults.length > 0 && searchResults[activeResultIndex] === node.id;
    const dimmed = hoveredNode && !isConnected;

    if (isHovered || isActiveResult) {
      ctx.shadowColor = isActiveResult ? "hsl(45, 100%, 60%)" : cfg.bg;
      ctx.shadowBlur = isActiveResult ? 20 : 15;
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = isActiveResult ? "hsl(45, 90%, 45%)" : dimmed ? `${cfg.bg}33` : cfg.bg;
    ctx.fill();

    ctx.strokeStyle = isActiveResult ? "hsl(45, 100%, 70%)" : isHighlighted ? "hsl(45, 100%, 60%)" : isHovered ? "#fff" : dimmed ? `${cfg.bg}22` : `${cfg.bg}88`;
    ctx.lineWidth = isActiveResult ? 3 / globalScale : isHighlighted ? 2 / globalScale : isHovered ? 2 : 0.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (globalScale > 1.2 || isHovered || isConnected || isHighlighted || isActiveResult) {
      const fontSize = Math.max(10 / globalScale, 2.5);
      ctx.font = `${isHovered || isActiveResult ? "bold " : ""}${fontSize}px -apple-system, "Pretendard", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = dimmed ? "#99999966" : "#e2e8f0";
      ctx.fillText(node.label, node.x, node.y + size + 2);
    }
  }, [hoveredNode, connectedIds, highlightedIds, searchResults, activeResultIndex]);

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
    ctx.strokeStyle = isSearchHighlighted ? "hsl(45, 100%, 60%)" : dimmed ? "rgba(100,100,100,0.05)" : isHighlighted ? "rgba(200,200,255,0.6)" : "rgba(100,116,139,0.2)";
    ctx.lineWidth = isSearchHighlighted ? 2 / globalScale : isHighlighted ? 1.5 / globalScale : 0.5 / globalScale;
    ctx.stroke();

    if (globalScale > 2 && link.type && !dimmed) {
      const midX = (s.x + t.x) / 2;
      const midY = (s.y + t.y) / 2;
      const fontSize = Math.max(8 / globalScale, 2);
      ctx.font = `${fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(148,163,184,0.5)";
      const label = EDGE_LABELS[link.type as GraphEdgeType] || link.type;
      ctx.fillText(label, midX, midY);
    }
  }, [hoveredNode, connectedIds, highlightedIds]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    setDetailOpen(true);
    focusOnNode(node.id);
  }, [focusOnNode]);

  const handleNodeHover = useCallback((node: any, prevNode: any) => {
    setHoveredNode(node?.id || null);
    if (node && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const fg = fgRef.current;
      if (fg) {
        const coords = fg.graph2ScreenCoords(node.x, node.y);
        setTooltipPos({ x: coords.x + rect.left, y: coords.y + rect.top });
      }
    } else {
      setTooltipPos(null);
    }
  }, []);

  const handleContextMenu = useCallback((node: any, event: MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, node });
  }, []);

  // Get file path from node for navigation
  const getNodeFilePath = (node: GraphNode): string | null => {
    if (node.id.startsWith("d:")) return node.id.substring(2);
    return null;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full min-h-0" onClick={() => { setContextMenu(null); }}>
      {/* Top bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 border-b bg-background/95 backdrop-blur z-10 shrink-0 flex-wrap">
        {showHeader && !isMobile && (
          <h3 className="text-sm font-semibold mr-2">지식 그래프</h3>
        )}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-20 sm:w-28 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {Object.entries(NODE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.icon} {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-0 max-w-xs ml-1 sm:ml-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="노드 검색..."
            className="h-7 pl-7 text-xs"
          />
          {searchQuery && (
            <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{activeResultIndex + 1}/{searchResults.length}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => goToResult(activeResultIndex - 1)}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => goToResult(activeResultIndex + 1)}>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 300)}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.3, 300)}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fgRef.current?.zoomToFit(400, 40)}>
            <Maximize className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Legend - hidden on mobile */}
      {!isMobile && (
        <div className="absolute top-14 left-3 z-10 flex flex-col gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-2 border shadow-sm">
          {Object.entries(NODE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              className={`flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors ${filterType === key ? "bg-muted font-medium" : ""}`}
              onClick={() => setFilterType(filterType === key ? "all" : key)}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.bg }} />
              {cfg.label}
            </button>
          ))}
        </div>
      )}

      {/* Graph */}
      <div ref={containerRef} className="flex-1 relative min-h-0 bg-[hsl(222,47%,6%)]" style={{ minHeight: isMobile ? 400 : 500 }}>
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={filteredData}
          nodeCanvasObject={paintNode}
          linkCanvasObject={paintLink}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onNodeRightClick={handleContextMenu}
          nodeRelSize={6}
          linkDirectionalParticles={0}
          cooldownTicks={100}
          enableNodeDrag
          enableZoomInteraction
          enablePanInteraction
          backgroundColor="hsl(222, 47%, 6%)"
        />
        {!isMobile && <Minimap fgRef={fgRef} graphData={filteredData} />}
      </div>

      {/* Tooltip */}
      {hoveredNode && tooltipPos && (
        <div
          className="fixed z-50 bg-popover border rounded-lg shadow-lg px-3 py-2 pointer-events-none"
          style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 10 }}
        >
          {(() => {
            const n = graphData.nodes.find((n) => n.id === hoveredNode);
            if (!n) return null;
            const cfg = NODE_CONFIG[n.type];
            const conns = getConnections(n.id);
            return (
              <div>
                <p className="text-xs font-semibold flex items-center gap-1">
                  <span>{cfg?.icon}</span> {n.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{cfg?.label}</p>
                {conns.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">연결: {conns.length}개</p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2"
            onClick={() => {
              focusOnNode(contextMenu.node.id);
              setContextMenu(null);
            }}
          >
            🔍 포커스
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2"
            onClick={() => {
              setSelectedNode(contextMenu.node);
              setDetailOpen(true);
              setContextMenu(null);
            }}
          >
            📋 상세보기
          </button>
          {getNodeFilePath(contextMenu.node) && (
            <button
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2"
              onClick={() => {
                const path = getNodeFilePath(contextMenu.node);
                if (path) navigate(`/doc/${encodeURIComponent(path)}`);
                setContextMenu(null);
              }}
            >
              📄 문서 상세
            </button>
          )}
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedNode && (
                <>
                  <span>{NODE_CONFIG[selectedNode.type]?.icon}</span>
                  {selectedNode.label}
                </>
              )}
            </SheetTitle>
          </SheetHeader>
          {selectedNode && (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">유형</p>
                <Badge variant="secondary">{NODE_CONFIG[selectedNode.type]?.label}</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">연결된 노드</p>
                <div className="space-y-2">
                  {getConnections(selectedNode.id).map(({ node, edgeType }) => (
                    <button
                      key={node.id}
                      className="w-full text-left flex items-center gap-2 rounded-md border p-2 text-xs hover:bg-muted transition-colors"
                      onClick={() => {
                        focusOnNode(node.id);
                        setSelectedNode(node);
                      }}
                    >
                      <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NODE_CONFIG[node.type]?.bg }} />
                      <span className="font-medium truncate">{node.label}</span>
                      {edgeType && (
                        <Badge variant="outline" className="ml-auto text-[10px] shrink-0">
                          {EDGE_LABELS[edgeType] || edgeType}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {getNodeFilePath(selectedNode) && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      const path = getNodeFilePath(selectedNode);
                      if (path) navigate(`/doc/${encodeURIComponent(path)}`);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> 문서 상세 보기
                  </Button>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
