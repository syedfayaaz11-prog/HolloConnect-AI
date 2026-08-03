"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Download, Trash2 } from "lucide-react";
import { GeneratedImage, absoluteImageUrl, deleteImage } from "@/lib/images";

function ImageCardImpl({
  image,
  onDeleted,
}: {
  image: GeneratedImage;
  onDeleted: (id: string) => void;
}) {
  const src = absoluteImageUrl(image.url);

  async function onDelete() {
    await deleteImage(image.id);
    onDeleted(image.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-xl2 overflow-hidden group relative"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={image.prompt} className="w-full aspect-square object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <p className="text-xs text-gray-200 line-clamp-2 mb-2 leading-snug">{image.prompt}</p>
        <div className="flex gap-2">
          <a
            href={src}
            download
            className="flex items-center gap-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 text-white transition-colors"
          >
            <Download size={12} />
            Download
          </a>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-xs rounded-lg bg-white/10 hover:bg-red-500/40 backdrop-blur-sm px-3 py-1.5 text-white transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export const ImageCard = memo(ImageCardImpl);
