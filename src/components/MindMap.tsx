import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { FolderNode, BrowseFile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Maximize, Minus, Plus, Search, X, ChevronUp, ChevronDown } from "lucide-react";

// ─── Types ───
interface MindMapNode {
  id: string;
  label: string;
  path: string;
  children: MindMapNode[];
  fileCount: number;
  fileType?: string;
  depth: number;
  expanded: boolean;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

// ─── File type icon map ───
const FILE_TYPE_ICON: Record<string, string> = {
  pdf: "📕",
  pptx: "📊",
  xlsx: "📗",
  csv: "📗",
  docx: "📘",
  hwp: "📄",
  ipynb: "🔬",
};
const FOLDER_ICON = "📁";
const getFileIcon = (fileType?: string) => fileType ? (FILE_TYPE_ICON[fileType] || "📄") : "";

// ─── Color palette per depth ───
const DEPTH_COLORS = [
  "hsl(234, 89%, 64%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(340, 82%, 52%)",
];

const getColor = (depth: number) => DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];

// ─── Build tree from FolderNode ───
function buildMindMapTree(node: FolderNode, depth = 0, files?: BrowseFile[]): MindMapNode {
  const fileNodes: MindMapNode[] = [];

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
        fileType: f.file_type,
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

  resolveCollisions(root);
}

// ─── Collision resolution ───
function resolveCollisions(root: MindMapNode) {
  const visible = collectVisible(root);
  const minDist = 90;

  for (let iter = 0; iter < 5; iter++) {
    let moved = false;
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i];
        const b = visible[j];
        if (a.depth === 0 || b.depth === 0) continue;

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

// ─── All nodes collector (including collapsed) ───
function collectAll(node: MindMapNode): MindMapNode[] {
  const result = [node];
  node.children.forEach((c) => result.push(...collectAll(c)));
  return result;
}

// ─── Find path from root to a target node ───
function findPathToNode(root: MindMapNode, targetId: string): MindMapNode[] | null {
  if (root.id === targetId) return [root];
  for (const child of root.children) {
    const path = findPathToNode(child, targetId);
    if (path) return [root, ...path];
  }
  return null;
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

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: MindMapNode } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const MINIMAP_W = 180;
  const MINIMAP_H = 120;

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

  // ─── Search logic ───
  const navigateToResult = useCallback((nodeId: string) => {
    const root = rootRef.current;
    if (!root) return;

    const path = findPathToNode(root, nodeId);
    if (!path) return;

    // Highlight all nodes on path
    const pathIds = new Set(path.map((n) => n.id));
    setHighlightedIds(pathIds);

    // Expand all ancestors
    path.forEach((n, i) => {
      if (i < path.length - 1) n.expanded = true;
    });

    layoutTree(root, dimensions.width / 2, dimensions.height / 2);

    // Pan to center on target
    const target = path[path.length - 1];
    setTimeout(() => {
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;
      setPan({ x: cx - target.targetX * zoom, y: cy - target.targetY * zoom });
      forceUpdate((n) => n + 1);
    }, 50);
  }, [dimensions, zoom]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !rootRef.current) {
      setSearchResults([]);
      setHighlightedIds(new Set());
      setActiveResultIndex(0);
      forceUpdate((n) => n + 1);
      return;
    }

    const allNodes = collectAll(rootRef.current);
    const q = query.toLowerCase();
    const matches = allNodes
      .filter((n) => n.label.toLowerCase().includes(q) || n.path.toLowerCase().includes(q))
      .map((n) => n.id);

    setSearchResults(matches);
    setActiveResultIndex(0);

    if (matches.length > 0) {
      navigateToResult(matches[0]);
    } else {
      setHighlightedIds(new Set());
    }
  }, [navigateToResult]);

  const goToResult = useCallback((index: number) => {
    if (searchResults.length === 0) return;
    const i = ((index % searchResults.length) + searchResults.length) % searchResults.length;
    setActiveResultIndex(i);
    navigateToResult(searchResults[i]);
  }, [searchResults, navigateToResult]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setHighlightedIds(new Set());
    setActiveResultIndex(0);
    forceUpdate((n) => n + 1);
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

        const mx = (node.x + child.x) / 2;
        const my = (node.y + child.y) / 2;
        ctx.quadraticCurveTo(mx + (child.y - node.y) * 0.1, my - (child.x - node.x) * 0.1, child.x, child.y);

        const isHighlightPath = highlightedIds.has(child.id) && highlightedIds.has(node.id);
        const isHoverPath = hoveredId === child.id || hoveredId === node.id;
        ctx.strokeStyle = isHighlightPath
          ? "hsl(45, 100%, 60%)"
          : isHoverPath
            ? getColor(child.depth)
            : `${getColor(child.depth)}44`;
        ctx.lineWidth = isHighlightPath ? 3 / zoom : isHoverPath ? 2.5 / zoom : 1.5 / zoom;
        ctx.stroke();
      });
    });

    // Draw nodes
    visible.forEach((node) => {
      const isFile = node.id.startsWith("file:");
      const isHovered = hoveredId === node.id;
      const isRoot = node.depth === 0;
      const isHighlighted = highlightedIds.has(node.id);
      const isActiveResult = searchResults.length > 0 && searchResults[activeResultIndex] === node.id;
      const color = getColor(node.depth);

      const icon = isFile ? getFileIcon(node.fileType) : (!isRoot && node.children.length > 0 ? FOLDER_ICON : "");
      const displayLabel = icon ? `${icon} ${node.label}` : node.label;
      const fontSize = isRoot ? 14 / zoom : Math.max(11 / zoom, 8);
      ctx.font = `${isHovered || isRoot || isActiveResult ? "600" : "400"} ${fontSize}px -apple-system, "Pretendard", sans-serif`;
      const textWidth = ctx.measureText(displayLabel).width;
      const paddingX = isRoot ? 20 : 14;
      const paddingY = isRoot ? 10 : 7;
      const boxW = textWidth + paddingX * 2;
      const boxH = fontSize + paddingY * 2;
      const radius = isRoot ? 12 : 8;

      // Shadow
      if (isHovered || isRoot || isActiveResult) {
        ctx.shadowColor = isActiveResult ? "hsl(45, 100%, 60%)" : `${color}55`;
        ctx.shadowBlur = isActiveResult ? 20 : isHovered ? 16 : 8;
        ctx.shadowOffsetY = 2;
      }

      // Background
      ctx.beginPath();
      ctx.roundRect(node.x - boxW / 2, node.y - boxH / 2, boxW, boxH, radius);
      ctx.fillStyle = isActiveResult
        ? "hsl(45, 90%, 45%)"
        : isRoot
          ? color
          : isHighlighted
            ? `${color}dd`
            : isHovered
              ? color
              : isFile
                ? "hsl(222, 47%, 14%)"
                : "hsl(222, 47%, 11%)";
      ctx.fill();

      // Border
      ctx.strokeStyle = isActiveResult
        ? "hsl(45, 100%, 70%)"
        : isHighlighted
          ? "hsl(45, 100%, 60%)"
          : isHovered || isRoot ? color : `${color}66`;
      ctx.lineWidth = isActiveResult ? 3 / zoom : isHighlighted ? 2 / zoom : isHovered ? 2 / zoom : 1 / zoom;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Label
      ctx.fillStyle = isRoot || isHovered || isActiveResult || isHighlighted ? "#fff" : "#e2e8f0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(displayLabel, node.x, node.y);

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

    // ─── Minimap ───
    const miniCanvas = minimapRef.current;
    if (miniCanvas) {
      const mCtx = miniCanvas.getContext("2d");
      if (mCtx) {
        const mdpr = window.devicePixelRatio || 1;
        miniCanvas.width = MINIMAP_W * mdpr;
        miniCanvas.height = MINIMAP_H * mdpr;
        mCtx.scale(mdpr, mdpr);

        // Background
        mCtx.fillStyle = "hsl(222, 47%, 8%)";
        mCtx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

        // Compute bounds of all visible nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        visible.forEach((n) => {
          if (n.x < minX) minX = n.x;
          if (n.y < minY) minY = n.y;
          if (n.x > maxX) maxX = n.x;
          if (n.y > maxY) maxY = n.y;
        });

        const pad = 60;
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

        // Draw edges
        mCtx.lineWidth = 0.5;
        visible.forEach((n) => {
          if (!n.expanded) return;
          n.children.forEach((c) => {
            const p1 = toMini(n.x, n.y);
            const p2 = toMini(c.x, c.y);
            mCtx.beginPath();
            mCtx.moveTo(p1.mx, p1.my);
            mCtx.lineTo(p2.mx, p2.my);
            mCtx.strokeStyle = `${getColor(c.depth)}66`;
            mCtx.stroke();
          });
        });

        // Draw nodes as dots
        visible.forEach((n) => {
          const { mx, my } = toMini(n.x, n.y);
          const r = n.depth === 0 ? 3 : 1.5;
          mCtx.beginPath();
          mCtx.arc(mx, my, r, 0, Math.PI * 2);
          mCtx.fillStyle = getColor(n.depth);
          mCtx.fill();
        });

        // Draw viewport rect
        const vpLeft = -pan.x / zoom;
        const vpTop = -pan.y / zoom;
        const vpW = dimensions.width / zoom;
        const vpH = dimensions.height / zoom;
        const vp1 = toMini(vpLeft, vpTop);
        const vp2 = toMini(vpLeft + vpW, vpTop + vpH);
        mCtx.strokeStyle = "hsl(45, 100%, 60%)";
        mCtx.lineWidth = 1.5;
        mCtx.strokeRect(vp1.mx, vp1.my, vp2.mx - vp1.mx, vp2.my - vp1.my);
      }
    }

    if (!isSettled(root)) {
      animRef.current = requestAnimationFrame(render);
    }
  }, [dimensions, pan, zoom, hoveredId, highlightedIds, searchResults, activeResultIndex]);

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

    for (let i = visible.length - 1; i >= 0; i--) {
      const node = visible[i];
      const isRoot = node.depth === 0;
      const fontSize = isRoot ? 14 / zoom : Math.max(11 / zoom, 8);
      const canvas = canvasRef.current;
      if (!canvas) continue;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.font = `400 ${fontSize}px -apple-system, sans-serif`;
      const isFile = node.id.startsWith("file:");
      const icon = isFile ? getFileIcon(node.fileType) : (!isRoot && node.children.length > 0 ? FOLDER_ICON : "");
      const displayLabel = icon ? `${icon} ${node.label}` : node.label;
      const tw = ctx.measureText(displayLabel).width;
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

  const draggingNode = useRef<MindMapNode | null>(null);
  const didDrag = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x: wx, y: wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const node = findNodeAt(wx, wy);

    if (node && node.depth > 0) {
      draggingNode.current = node;
      didDrag.current = false;
    } else {
      isPanning.current = true;
    }
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;

    if (draggingNode.current) {
      const node = draggingNode.current;
      node.targetX += dx / zoom;
      node.targetY += dy / zoom;
      node.x = node.targetX;
      node.y = node.targetY;
      didDrag.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      forceUpdate((n) => n + 1);
      animRef.current = requestAnimationFrame(render);
      return;
    }

    if (isPanning.current) {
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
    draggingNode.current = null;
    isPanning.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x: wx, y: wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const node = findNodeAt(wx, wy);
    if (!node) return;

    if (node.id.startsWith("file:")) {
      navigate(`/doc/${encodeURIComponent(node.path)}`);
      return;
    }

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

  // ─── Context menu actions ───
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x: wx, y: wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const node = findNodeAt(wx, wy);
    if (node) {
      setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, node });
    } else {
      setContextMenu(null);
    }
  };

  const ctxToggleExpand = () => {
    if (!contextMenu) return;
    const node = contextMenu.node;
    node.expanded = !node.expanded;
    layoutTree(rootRef.current!, dimensions.width / 2, dimensions.height / 2);
    setContextMenu(null);
    forceUpdate((n) => n + 1);
    animRef.current = requestAnimationFrame(render);
  };

  const ctxExpandSubtree = () => {
    if (!contextMenu) return;
    const expandAll = (n: MindMapNode) => { n.expanded = true; n.children.forEach(expandAll); };
    expandAll(contextMenu.node);
    layoutTree(rootRef.current!, dimensions.width / 2, dimensions.height / 2);
    setContextMenu(null);
    forceUpdate((n) => n + 1);
    animRef.current = requestAnimationFrame(render);
  };

  const ctxCollapseSubtree = () => {
    if (!contextMenu) return;
    const collapseAll = (n: MindMapNode) => { n.expanded = false; n.children.forEach(collapseAll); };
    contextMenu.node.children.forEach(collapseAll);
    layoutTree(rootRef.current!, dimensions.width / 2, dimensions.height / 2);
    setContextMenu(null);
    forceUpdate((n) => n + 1);
    animRef.current = requestAnimationFrame(render);
  };

  const ctxFocusNode = () => {
    if (!contextMenu) return;
    const node = contextMenu.node;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    setPan({ x: cx - node.x * zoom, y: cy - node.y * zoom });
    setZoom(1.5);
    setContextMenu(null);
    forceUpdate((n) => n + 1);
  };

  const ctxGoToDoc = () => {
    if (!contextMenu) return;
    navigate(`/doc/${encodeURIComponent(contextMenu.node.path)}`);
    setContextMenu(null);
  };

  return (
    <div className="relative w-full h-full" ref={containerRef}>
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

      {/* Minimap */}
      <div className="absolute bottom-3 right-3 z-10 rounded-lg overflow-hidden border border-border shadow-lg bg-background/90 backdrop-blur-sm">
        <canvas
          ref={minimapRef}
          style={{ width: MINIMAP_W, height: MINIMAP_H, cursor: "crosshair" }}
          onClick={(e) => {
            // Click on minimap to navigate
            const root = rootRef.current;
            if (!root) return;
            const rect = minimapRef.current?.getBoundingClientRect();
            if (!rect) return;

            const visible = collectVisible(root);
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            visible.forEach((n) => {
              if (n.x < minX) minX = n.x;
              if (n.y < minY) minY = n.y;
              if (n.x > maxX) maxX = n.x;
              if (n.y > maxY) maxY = n.y;
            });
            const pad = 60;
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

            setPan({
              x: dimensions.width / 2 - worldClickX * zoom,
              y: dimensions.height / 2 - worldClickY * zoom,
            });
            forceUpdate((n) => n + 1);
          }}
        />
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 left-3 z-10 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1">
        클릭: 펼치기/접기 · 파일 클릭: 문서 상세 · 노드 드래그: 이동 · 빈 곳 드래그: 패닝 · 스크롤: 확대/축소
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseDown={(e) => { setContextMenu(null); handleMouseDown(e); }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { draggingNode.current = null; isPanning.current = false; setHoveredId(null); }}
        onClick={handleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div
            className="absolute z-30 min-w-[180px] rounded-lg border border-border bg-popover text-popover-foreground shadow-xl py-1 animate-in fade-in-0 zoom-in-95"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground truncate max-w-[200px]">
              {contextMenu.node.label}
            </div>
            <div className="h-px bg-border my-1" />

            {!contextMenu.node.id.startsWith("file:") && contextMenu.node.children.length > 0 && (
              <>
                <button onClick={ctxToggleExpand} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                  {contextMenu.node.expanded ? "📁 접기" : "📂 펼치기"}
                </button>
                <button onClick={ctxExpandSubtree} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                  📂 하위 전체 펼치기
                </button>
                {contextMenu.node.expanded && (
                  <button onClick={ctxCollapseSubtree} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                    📁 하위 전체 접기
                  </button>
                )}
                <div className="h-px bg-border my-1" />
              </>
            )}

            <button onClick={ctxFocusNode} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
              🔍 이 노드로 포커스
            </button>

            {contextMenu.node.id.startsWith("file:") && (
              <button onClick={ctxGoToDoc} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                📄 문서 상세 보기
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
