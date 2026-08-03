"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileType,
  File as FileIcon,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { DocumentSummaryItem } from "@/lib/documents";

function iconForMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv") || mimeType.includes("excel"))
    return FileSpreadsheet;
  if (mimeType.includes("pdf")) return FileType;
  if (mimeType.includes("word") || mimeType.includes("presentation") || mimeType.includes("text"))
    return FileText;
  return FileIcon;
}

const STATUS_CONFIG: Record<
  DocumentSummaryItem["status"],
  { label: string; className: string; icon: typeof CheckCircle2; spin?: boolean }
> = {
  PROCESSING: { label: "Processing…", className: "text-yellow-400 bg-yellow-400/10", icon: Loader2, spin: true },
  READY: { label: "Ready", className: "text-green-400 bg-green-400/10", icon: CheckCircle2 },
  FAILED: { label: "Failed", className: "text-red-400 bg-red-400/10", icon: XCircle },
};

export function DocumentListItem({ doc }: { doc: DocumentSummaryItem }) {
  const Icon = iconForMime(doc.mimeType);
  const status = STATUS_CONFIG[doc.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/documents/${doc.id}`}
        className="glass rounded-xl2 p-4 flex items-center gap-3.5 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 group"
      >
        <div className="w-10 h-10 shrink-0 rounded-xl bg-accent-gradient-soft flex items-center justify-center group-hover:scale-105 transition-transform">
          <Icon size={17} className="text-accent-violet" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-200 truncate font-medium">{doc.filename}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{doc.mimeType}</p>
        </div>

        <span
          className={`flex items-center gap-1.5 text-[11px] font-medium shrink-0 rounded-lg px-2.5 py-1 ${status.className}`}
        >
          <StatusIcon size={11} className={status.spin ? "animate-spin" : ""} />
          {status.label}
        </span>
      </Link>
    </motion.div>
  );
}
