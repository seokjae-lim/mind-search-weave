import { ChunkLocation } from "@/lib/types";
import { MapPin } from "lucide-react";

export function LocationBadge({ location }: { location: ChunkLocation }) {
  const parts: string[] = [];
  if (location.slide != null) parts.push(`슬라이드 ${location.slide}`);
  if (location.page != null) parts.push(`페이지 ${location.page}`);
  if (location.sheet != null) parts.push(`시트: ${location.sheet}`);
  if (location.row != null) parts.push(`행 ${location.row}`);
  if (location.col != null) parts.push(`열 ${location.col}`);
  if (location.cell != null) parts.push(`셀 ${location.cell}`);

  if (parts.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
      <MapPin className="h-3 w-3" />
      {parts.join(" · ")}
    </span>
  );
}
