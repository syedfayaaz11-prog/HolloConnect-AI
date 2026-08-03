"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Download, Trash2, Clapperboard } from "lucide-react";
import { VideoGeneration, absoluteMediaUrl, deleteVideo } from "@/lib/videos";

const STATUS_LABEL: Record<VideoGeneration["status"], string> = {
  PENDING: "Queued",
  PROCESSING: "Generating…",
  COMPLETE: "Ready",
  FAILED: "Failed",
};

function VideoCardImpl({
  video,
  onDeleted,
}: {
  video: VideoGeneration;
  onDeleted: (id: string) => void;
}) {
  async function onDelete() {
    await deleteVideo(video.id);
    onDeleted(video.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-xl2 overflow-hidden"
    >
      <div className="aspect-video bg-black/40 flex items-center justify-center">
        {video.status === "COMPLETE" && video.url ? (
          <video src={absoluteMediaUrl(video.url)} controls className="w-full h-full object-cover" />
        ) : video.status === "FAILED" ? (
          <p className="text-xs text-red-400 px-4 text-center">{video.error ?? "Generation failed"}</p>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-500 w-full px-8">
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-9 h-9 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center"
            >
              <Clapperboard size={16} className="text-white" />
            </motion.div>

            {/* Indeterminate progress: Replicate's predictions API doesn't report a real
                percentage, so this sweeps back and forth to read as "actively working" rather
                than faking a specific completion amount. */}
            <div className="w-full max-w-[160px] h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
              <motion.div
                className="absolute inset-y-0 w-1/3 rounded-full bg-accent-gradient shadow-glow-sm"
                animate={{ left: ["-33%", "100%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <p className="text-xs flex items-center gap-1">
              {STATUS_LABEL[video.status]}
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                ●
              </motion.span>
            </p>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-300 line-clamp-2">{video.prompt}</p>
        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-[10px] ${
              video.status === "COMPLETE"
                ? "text-green-400"
                : video.status === "FAILED"
                  ? "text-red-400"
                  : "text-yellow-400"
            }`}
          >
            {STATUS_LABEL[video.status]}
          </span>
          <div className="flex gap-2">
            {video.status === "COMPLETE" && video.url && (
              <a
                href={absoluteMediaUrl(video.url)}
                download
                className="flex items-center gap-1 text-[10px] rounded-lg bg-white/5 hover:bg-white/10 px-2 py-1 text-white transition-colors"
              >
                <Download size={10} />
                Download
              </a>
            )}
            <button
              onClick={onDelete}
              className="flex items-center gap-1 text-[10px] rounded-lg bg-white/5 hover:bg-red-500/30 px-2 py-1 text-white transition-colors"
            >
              <Trash2 size={10} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const VideoCard = memo(VideoCardImpl);
