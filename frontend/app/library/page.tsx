"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { GeneratedImage, listImages } from "@/lib/images";
import { VideoGeneration, listVideos } from "@/lib/videos";
import { DocumentSummaryItem, deleteDocument, listDocuments } from "@/lib/documents";
import { ImageCard } from "@/components/images/ImageCard";
import { VideoCard } from "@/components/videos/VideoCard";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

type Filter = "all" | "images" | "videos" | "documents";

const DOC_STATUS_ICON: Record<DocumentSummaryItem["status"], typeof Loader2> = {
  PROCESSING: Loader2,
  READY: CheckCircle2,
  FAILED: XCircle,
};

function DocumentLibraryCard({ doc, onDeleted }: { doc: DocumentSummaryItem; onDeleted: (id: string) => void }) {
  const StatusIcon = DOC_STATUS_ICON[doc.status];
  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await deleteDocument(doc.id);
    onDeleted(doc.id);
  }
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/documents/${doc.id}`}
        className="group glass rounded-xl2 p-4 flex flex-col gap-3 h-full hover:border-white/[0.12] border border-transparent transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-lg bg-accent-gradient-soft flex items-center justify-center shrink-0">
            <FileText size={15} className="text-accent-violet" />
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
          >
            <Trash2 size={13} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{doc.filename}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusIcon size={11} className={doc.status === "PROCESSING" ? "animate-spin text-yellow-400" : doc.status === "READY" ? "text-green-400" : "text-red-400"} />
          <span className="text-[10px] text-gray-500 capitalize">{doc.status.toLowerCase()}</span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function LibraryPage() {
  const { user, checking } = useRequireAuth();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [videos, setVideos] = useState<VideoGeneration[]>([]);
  const [docs, setDocs] = useState<DocumentSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (checking) return;
    Promise.all([listImages().catch(() => []), listVideos().catch(() => []), listDocuments().catch(() => [])]).then(
      ([i, v, d]) => {
        setImages(i);
        setVideos(v);
        setDocs(d);
        setLoading(false);
      }
    );
  }, [checking]);

  const total = images.length + videos.length + docs.length;

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: total },
    { id: "images", label: "Images", count: images.length },
    { id: "videos", label: "Videos", count: videos.length },
    { id: "documents", label: "Documents", count: docs.length },
  ];

  // Merge into one recency-sorted feed when "All" is selected, tagged so we know which card
  // component to render for each entry.
  const items = useMemo(() => {
    type Entry =
      | { kind: "image"; createdAt: string; data: GeneratedImage }
      | { kind: "video"; createdAt: string; data: VideoGeneration }
      | { kind: "document"; createdAt: string; data: DocumentSummaryItem };
    const all: Entry[] = [
      ...images.map((d) => ({ kind: "image" as const, createdAt: d.createdAt, data: d })),
      ...videos.map((d) => ({ kind: "video" as const, createdAt: d.createdAt, data: d })),
      ...docs.map((d) => ({ kind: "document" as const, createdAt: d.createdAt, data: d })),
    ];
    const filtered =
      filter === "all"
        ? all
        : filter === "images"
          ? all.filter((e) => e.kind === "image")
          : filter === "videos"
            ? all.filter((e) => e.kind === "video")
            : all.filter((e) => e.kind === "document");
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [images, videos, docs, filter]);

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AppShell user={user}>
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-1"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center">
            <LayoutGrid size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Library</h1>
            <p className="text-xs text-gray-400">Everything you've created, in one place</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-1.5 mt-6 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 shrink-0 transition-colors ${
                filter === t.id
                  ? "bg-accent-gradient-soft text-accent-violet"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {t.label}
              <span className="text-[10px] text-gray-500">{t.count}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton animate-shimmer rounded-xl2 aspect-square" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl2 p-10 text-center">
            <LayoutGrid size={26} className="text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-300 mb-1">Nothing here yet</p>
            <p className="text-xs text-gray-500 mb-6">
              Creations from Image AI, Video AI, and Document AI will show up here automatically.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { href: "/images", label: "Create an image", icon: ImageIcon },
                { href: "/videos", label: "Create a video", icon: VideoIcon },
                { href: "/documents", label: "Upload a document", icon: FileText },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-1.5 text-xs rounded-lg bg-white/[0.06] hover:bg-white/[0.1] px-3 py-2 text-gray-200 transition-colors"
                >
                  <a.icon size={13} />
                  {a.label}
                  <ArrowRight size={11} className="text-gray-500" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {items.map((entry) =>
                entry.kind === "image" ? (
                  <ImageCard
                    key={`img-${entry.data.id}`}
                    image={entry.data}
                    onDeleted={(id) => setImages((prev) => prev.filter((i) => i.id !== id))}
                  />
                ) : entry.kind === "video" ? (
                  <VideoCard
                    key={`vid-${entry.data.id}`}
                    video={entry.data}
                    onDeleted={(id) => setVideos((prev) => prev.filter((v) => v.id !== id))}
                  />
                ) : (
                  <DocumentLibraryCard
                    key={`doc-${entry.data.id}`}
                    doc={entry.data}
                    onDeleted={(id) => setDocs((prev) => prev.filter((d) => d.id !== id))}
                  />
                )
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppShell>
  );
}
