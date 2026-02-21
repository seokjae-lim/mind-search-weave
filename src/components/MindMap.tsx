import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { FolderNode, BrowseFile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize, Minus, Plus } from "lucide-react";

// ─── Types ───
interface MindMapNode {
  id: string;
  label: string;
  path: string;
  children: MindMapNode[];
  fileCount: number;
  depth: number;
  expanded: boolean;
  // Layout (computed)
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

// ─── Color palette per depth ───
const DEPTH_COLORS = [
  "hsl(234, 89%, 64%)",   // root — indigo
  "hsl(262, 83%, 58%)",   // depth 1 — purple
  "hsl(199, 89%, 48%)",   // depth 2 — blue
  "hsl(160, 84%, 39%)",   // depth 3 — green
  "hsl(38, 92%, 50%)",    // depth 4 — amber
  "hsl(340, 82%, 52%)",   // depth 5 — pink
];

const getColor = (depth: number) => DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];

// ─── Build tree from FolderNode ───
function buildMindMapTree(node: FolderNode, depth = 0, files?: BrowseFile[]): MindMapNode {
  const fileNodes: MindMapNode[] = [];

  // Add actual file nodes for leaf folders
  if (files && node.file_count > 0) {
    const folderFiles = files.filter((f) => {
      const dir = f.file_path.substring(0, f.file_path.lastIndexOf("/"));
      return dir === node.path || f.file_path.startsWith(node.path + "/");
    });
    folderFiles.forEach((f) => {
      fileNodes.push({
        id: `file:${f.file_path}`,
        label: f.doc_title,
        path: f.file_path,
        children: [],
        fileCount: f.chunk_count,
        depth: depth + 1,
        expanded: false,
        x: 0, y: 0, targetX: 0, targetY: 0,
      });
    });
  }

  return {
    id: `folder:${node.path || "root"}`,
    label: node.name,
    path: node.path,
    children: [
      ...node.children.map((c) => buildMindMapTree(c, depth + 1, files)),
      ...fileNodes,
    ],
    fileCount: node.file_count,
    depth,
    expanded: depth < 1,
    x: 0, y: 0, targetX: 0, targetY: 0,
  };
}

// ─── Count visible descendants for proportional spacing ───
function countVisibleDescendants(node: MindMapNode): number {
  if (!node.expanded || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countVisibleDescendants(c), 0);
}

// ─── Layout: compute positions with proportional angular allocation ───
function layoutTree(root: MindMapNode, centerX: number, centerY: number) {
  root.targetX = centerX;
  root.targetY = centerY;

  function layoutChildren(node: MindMapNode, angleCenter: number, angleRange: number, radius: number) {
    if (!node.expanded || node.children.length === 0) return;

    const totalWeight = node.children.reduce((s, c) => s + countVisibleDescendants(c), 0);
    let currentAngle = angleCenter - angleRange / 2;

    node.children.forEach((child) => {
      const weight = countVisibleDescendants(child);
      const childAngleRange = (weight / totalWeight) * angleRange;
      const childAngle = currentAngle + childAngleRange / 2;

      child.targetX = node.targetX + Math.cos(childAngle) * radius;
      child.targetY = node.targetY + Math.sin(childAngle) * radius;

      const nextRadius = Math.max(radius * 0.75, 80);
      const nextAngleRange = Math.min(childAngleRange * 0.95, Math.PI * 0.9);
      layoutChildren(child, childAngle, nextAngleRange, nextRadius);

      currentAngle += childAngleRange;
    });
  }

  if (root.expanded && root.children.length > 0) {
    const count = root.children.length;
    // Dynamic radius based on child count
    const baseRadius = Math.max(200, count * 35);
    const fullAngle = Math.PI * 2;
    const totalWeight = root.children.reduce((s, c) => s + countVisibleDescendants(c), 0);
    let currentAngle = -Math.PI / 2;

    root.children.forEach((child) => {
      const weight = countVisibleDescendants(child);
      const childAngleRange = (weight / totalWeight) * fullAngle;
      const childAngle = currentAngle + childAngleRange / 2;

      child.targetX = root.targetX + Math.cos(childAngle) * baseRadius;
      child.targetY = root.targetY + Math.sin(childAngle) * baseRadius;

      const subRadius = Math.max(140, weight * 30);
      layoutChildren(child, childAngle, Math.min(childAngleRange * 0.85, Math.PI * 0.8), subRadius);

      currentAngle += childAngleRange;
    });
  }

  // Collision resolution pass
  resolveCollisions(root);
}

// ─── Collision resolution ───
function resolveCollisions(root: MindMapNode) {
  const visible = collectVisible(root);
  const minDist = 90; // minimum distance between node centers

  for (let iter = 0; iter < 5; iter++) {
    let moved = false;
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i];
        const b = visible[j];
        if (a.depth === 0 || b.depth === 0) continue; // don't push root

        const dx = b.targetX - a.targetX;
        const dy = b.targetY - a.targetY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist && dist > 0.1) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.targetX -= nx * push;
          a.targetY -= ny * push;
          b.targetX += nx * push;
          b.targetY += ny * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

// ─── Animate positions ───
function animatePositions(node: MindMapNode, lerp = 0.15) {
  node.x += (node.targetX - node.x) * lerp;
  node.y += (node.targetY - node.y) * lerp;
  if (node.expanded) {
    node.children.forEach((c) => animatePositions(c, lerp));
  }
}

function isSettled(node: MindMapNode, threshold = 0.5): boolean {
  if (Math.abs(node.x - node.targetX) > threshold || Math.abs(node.y - node.targetY) > threshold) return false;
  if (node.expanded) return node.children.every((c) => isSettled(c, threshold));
  return true;
}

// ─── Visible nodes collector ───
function collectVisible(node: MindMapNode): MindMapNode[] {
  const result = [node];
  if (node.expanded) {
    node.children.forEach((c) => result.push(...collectVisible(c)));
  }
  return result;
}

// ─── Component ───
interface MindMapProps {
  tree: FolderNode;
  files: BrowseFile[];
  onSelectFile?: (filePath: string) => void;
}

export function MindMap({ tree, files, onSelectFile }: MindMapProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<MindMapNode | null>(null);
  const animRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [, forceUpdate] = useState(0);

  // Build tree
  useEffect(() => {
    const root = buildMindMapTree(tree, 0, files);
    root.x = dimensions.width / 2;
    root.y = dimensions.height / 2;
    layoutTree(root, dimensions.width / 2, dimensions.height / 2);
    rootRef.current = root;
    forceUpdate((n) => n + 1);
  }, [tree, files, dimensions]);

  // Responsive sizing
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(500, containerRef.current.clientHeight),
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    animatePositions(root);
    const visible = collectVisible(root);

    // Draw edges
    visible.forEach((node) => {
      if (!node.expanded) return;
      node.children.forEach((child) => {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);

        // Curved line
        const mx = (node.x + child.x) / 2;
        const my = (node.y + child.y) / 2;
        ctx.quadraticCurveTo(mx + (child.y - node.y) * 0.1, my - (child.x - node.x) * 0.1, child.x, child.y);

        const isHoverPath = hoveredId === child.id || hoveredId === node.id;
        ctx.strokeStyle = isHoverPath
          ? getColor(child.depth)
          : `${getColor(child.depth)}44`;
        ctx.lineWidth = isHoverPath ? 2.5 / zoom : 1.5 / zoom;
        ctx.stroke();
      });
    });

    // Draw nodes
    visible.forEach((node) => {
      const isFile = node.id.startsWith("file:");
      const isHovered = hoveredId === node.id;
      const isRoot = node.depth === 0;
      const color = getColor(node.depth);

      // Node bubble
      const label = node.label;
      const fontSize = isRoot ? 14 / zoom : Math.max(11 / zoom, 8);
      ctx.font = `${isHovered || isRoot ? "600" : "400"} ${fontSize}px -apple-system, "Pretendard", sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const paddingX = isRoot ? 20 : 14;
      const paddingY = isRoot ? 10 : 7;
      const boxW = textWidth + paddingX * 2;
      const boxH = fontSize + paddingY * 2;
      const radius = isRoot ? 12 : 8;

      // Shadow
      if (isHovered || isRoot) {
        ctx.shadowColor = `${color}55`;
        ctx.shadowBlur = isHovered ? 16 : 8;
        ctx.shadowOffsetY = 2;
      }

      // Background
      ctx.beginPath();
      ctx.roundRect(node.x - boxW / 2, node.y - boxH / 2, boxW, boxH, radius);
      ctx.fillStyle = isRoot
        ? color
        : isHovered
          ? color
          : isFile
            ? "hsl(222, 47%, 14%)"
            : "hsl(222, 47%, 11%)";
      ctx.fill();

      // Border
      ctx.strokeStyle = isHovered || isRoot ? color : `${color}66`;
      ctx.lineWidth = isHovered ? 2 / zoom : 1 / zoom;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Label
      ctx.fillStyle = isRoot || isHovered ? "#fff" : "#e2e8f0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, node.x, node.y);

      // Expand indicator
      if (!isFile && node.children.length > 0) {
        const indicatorSize = 6 / zoom;
        const ix = node.x + boxW / 2 + 4;
        const iy = node.y;
        ctx.beginPath();
        ctx.arc(ix, iy, indicatorSize, 0, Math.PI * 2);
        ctx.fillStyle = node.expanded ? `${color}88` : `${color}44`;
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = `bold ${8 / zoom}px monospace`;
        ctx.fillText(node.expanded ? "−" : "+", ix, iy + 0.5 / zoom);
      }

      // File count badge
      if (isFile && node.fileCount > 0) {
        const badge = `${node.fileCount}`;
        ctx.font = `500 ${8 / zoom}px -apple-system, sans-serif`;
        const bw = ctx.measureText(badge).width + 6 / zoom;
        const bh = 12 / zoom;
        ctx.beginPath();
        ctx.roundRect(node.x + boxW / 2 - bw + 2, node.y - boxH / 2 - bh / 2, bw, bh, 3 / zoom);
        ctx.fillStyle = `${color}cc`;
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(badge, node.x + boxW / 2 - bw / 2 + 2, node.y - boxH / 2);
      }
    });

    ctx.restore();

    // Continue if not settled
    if (!isSettled(root)) {
      animRef.current = requestAnimationFrame(render);
    }
  }, [dimensions, pan, zoom, hoveredId]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  // ─── Interaction handlers ───
  const screenToWorld = (sx: number, sy: number) => ({
    x: (sx - pan.x) / zoom,
    y: (sy - pan.y) / zoom,
  });

  const findNodeAt = (wx: number, wy: number): MindMapNode | null => {
    const root = rootRef.current;
    if (!root) return null;
    const visible = collectVisible(root);

    // Check in reverse (top-most first)
    for (let i = visible.length - 1; i >= 0; i--) {
      const node = visible[i];
      const isRoot = node.depth === 0;
      const fontSize = isRoot ? 14 / zoom : Math.max(11 / zoom, 8);
      const canvas = canvasRef.current;
      if (!canvas) continue;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.font = `400 ${fontSize}px -apple-system, sans-serif`;
      const tw = ctx.measureText(node.label).width;
      const px = isRoot ? 20 : 14;
      const py = isRoot ? 10 : 7;
      const hw = (tw + px * 2) / 2;
      const hh = (fontSize + py * 2) / 2;

      if (wx >= node.x - hw && wx <= node.x + hw && wy >= node.y - hh && wy <= node.y + hh) {
        return node;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x: wx, y: wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const node = findNodeAt(wx, wy);
    setHoveredId(node?.id || null);
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x: wx, y: wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const node = findNodeAt(wx, wy);
    if (!node) return;

    if (node.id.startsWith("file:")) {
      const filePath = node.path;
      navigate(`/doc/${encodeURIComponent(filePath)}`);
      return;
    }

    // Toggle expand
    node.expanded = !node.expanded;
    const root = rootRef.current!;
    layoutTree(root, dimensions.width / 2, dimensions.height / 2);
    forceUpdate((n) => n + 1);
    animRef.current = requestAnimationFrame(render);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, zoom * delta));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setPan((p) => ({
      x: mx - (mx - p.x) * (newZoom / zoom),
      y: my - (my - p.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  };

  const fitView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (rootRef.current) {
      layoutTree(rootRef.current, dimensions.width / 2, dimensions.height / 2);
      forceUpdate((n) => n + 1);
    }
  };

  const expandAll = () => {
    if (!rootRef.current) return;
    const expand = (n: MindMapNode) => { n.expanded = true; n.children.forEach(expand); };
    expand(rootRef.current);
    layoutTree(rootRef.current, dimensions.width / 2, dimensions.height / 2);
    forceUpdate((n) => n + 1);
    animRef.current = requestAnimationFrame(render);
  };

  const collapseAll = () => {
    if (!rootRef.current) return;
    const collapse = (n: MindMapNode) => { if (n.depth > 0) n.expanded = false; n.children.forEach(collapse); };
    collapse(rootRef.current);
    layoutTree(rootRef.current, dimensions.width / 2, dimensions.height / 2);
    forceUpdate((n) => n + 1);
    animRef.current = requestAnimationFrame(render);
  };

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(3, z * 1.2))} title="확대">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))} title="축소">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={fitView} title="맞춤">
          <Maximize className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={expandAll}>
          <Plus className="h-3 w-3 mr-1" /> 전체 펼치기
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={collapseAll}>
          <Minus className="h-3 w-3 mr-1" /> 전체 접기
        </Button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 left-3 z-10 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1">
        클릭: 펼치기/접기 · 파일 클릭: 문서 상세 · 드래그: 이동 · 스크롤: 확대/축소
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isPanning.current = false; setHoveredId(null); }}
        onClick={handleClick}
        onWheel={handleWheel}
      />
    </div>
  );
}
