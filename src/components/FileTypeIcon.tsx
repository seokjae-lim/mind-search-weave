import { FileType } from "@/lib/types";
import { FileSpreadsheet, FileText, Presentation, FileCode, File } from "lucide-react";

const iconMap: Record<FileType, React.ComponentType<{ className?: string }>> = {
  pptx: Presentation,
  pdf: FileText,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  ipynb: FileCode,
  hwp: File,
  docx: FileText,
};

const colorMap: Record<FileType, string> = {
  pptx: "text-orange-500",
  pdf: "text-red-500",
  xlsx: "text-green-600",
  csv: "text-green-500",
  ipynb: "text-purple-500",
  hwp: "text-blue-400",
  docx: "text-blue-500",
};

export function FileTypeIcon({ type, className }: { type: FileType; className?: string }) {
  const Icon = iconMap[type] || File;
  const color = colorMap[type] || "";
  return <Icon className={`${color} ${className || "h-4 w-4"}`} />;
}

export function FileTypeBadge({ type }: { type: FileType }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-muted ${colorMap[type]}`}>
      {type.toUpperCase()}
    </span>
  );
}
