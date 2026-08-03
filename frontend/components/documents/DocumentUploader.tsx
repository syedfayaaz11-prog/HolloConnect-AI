"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, Loader2 } from "lucide-react";
import { uploadDocument } from "@/lib/documents";
import { DocumentSummaryItem } from "@/lib/documents";

export function DocumentUploader({
  onUploaded,
}: {
  onUploaded: (doc: DocumentSummaryItem) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const doc = await uploadDocument(file);
      onUploaded(doc);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!uploading) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      whileHover={!uploading ? { scale: 1.005 } : undefined}
      className={`glass rounded-2xl p-12 border-2 border-dashed text-center cursor-pointer transition-all duration-200 ${
        dragging
          ? "border-accent-purple/60 bg-accent-gradient-soft scale-[1.01] shadow-glow-sm"
          : "border-white/[0.1] hover:border-white/20 hover:bg-white/[0.04]"
      } ${uploading ? "cursor-not-allowed opacity-80" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.pptx,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.webp,.gif,.bmp"
        className="hidden"
        onChange={onFileSelected}
      />

      <motion.div
        animate={uploading ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={uploading ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
        className={`w-14 h-14 rounded-2xl bg-accent-gradient-soft mx-auto mb-4 flex items-center justify-center transition-shadow duration-300 ${
          dragging ? "shadow-glow" : ""
        }`}
      >
        {uploading ? (
          <Loader2 size={22} className="text-accent-violet animate-spin" />
        ) : (
          <UploadCloud size={22} className="text-accent-violet" />
        )}
      </motion.div>

      <p className="text-[15px] text-gray-100 font-medium">
        {uploading ? "Uploading & extracting…" : dragging ? "Drop it right here" : "Click to upload, or drag a file here"}
      </p>
      <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
        PDF, DOCX, PPTX, XLSX, CSV, TXT, or an image (OCR: PNG, JPEG, WEBP, GIF, BMP)
      </p>

      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </motion.div>
  );
}
