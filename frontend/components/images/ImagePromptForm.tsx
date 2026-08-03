"use client";

import { FormEvent, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Wand2, Square, RectangleVertical, RectangleHorizontal, ImagePlus, X } from "lucide-react";
import { ImageSize, uploadImageSource } from "@/lib/images";

const SIZES: { id: ImageSize; label: string; icon: typeof Square }[] = [
  { id: "1024x1024", label: "Square", icon: Square },
  { id: "1024x1792", label: "Portrait", icon: RectangleVertical },
  { id: "1792x1024", label: "Landscape", icon: RectangleHorizontal },
];

export function ImagePromptForm({
  onGenerate,
  loading,
  prompt: controlledPrompt,
  onPromptChange,
}: {
  onGenerate: (prompt: string, size: ImageSize, referenceImageUrl?: string) => void;
  loading: boolean;
  /** Optional — lets a parent (e.g. an inspiration card click) push text into the composer. */
  prompt?: string;
  onPromptChange?: (value: string) => void;
}) {
  const [internalPrompt, setInternalPrompt] = useState("");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const prompt = controlledPrompt ?? internalPrompt;

  // Reference image state — same "+", drag & drop, thumbnail, replace/remove pattern as
  // VideoPromptForm's source-image upload, for a consistent feel across both Studio tools.
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setPrompt(value: string) {
    if (onPromptChange) onPromptChange(value);
    else setInternalPrompt(value);
  }

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    const previewUrl = URL.createObjectURL(file);
    setReferencePreview(previewUrl);
    try {
      const url = await uploadImageSource(file);
      setReferenceImageUrl(url);
    } catch (err) {
      setUploadError((err as Error).message);
      setReferencePreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (loading || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  /** Clears the current reference image so a new one can be uploaded in its place ("replace
      image") — same handler backs both the explicit remove (X) button and picking a new
      file, which naturally replaces whatever was there before. */
  function clearReference() {
    setReferenceImageUrl(null);
    setReferencePreview(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading || uploading) return;
    onGenerate(prompt.trim(), size, referenceImageUrl ?? undefined);
  }

  return (
    <form
      onSubmit={submit}
      onDragOver={(e) => {
        e.preventDefault();
        if (!loading && !uploading) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
      className={`glass rounded-xl2 p-3 border transition-colors duration-150 ${
        dragActive ? "border-accent-violet/60 bg-accent-gradient-soft" : "border-transparent"
      }`}
    >
      <textarea
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={
          dragActive
            ? "Drop a reference image…"
            : referenceImageUrl
              ? "Describe how to transform the reference image…"
              : "Describe the image you want to create…"
        }
        className="w-full resize-none bg-transparent text-sm text-gray-100 placeholder:text-gray-500 outline-none leading-relaxed"
      />
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06] flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSize(s.id)}
                className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors ${
                  size === s.id
                    ? "bg-accent-gradient-soft text-accent-violet"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <s.icon size={13} />
                {s.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-white/10 hidden sm:block" />

          {/* The "+" reference image upload — click to browse or drag & drop anywhere on the
              composer (see onDrop/onDragOver on the form above). */}
          <label
            className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
              referenceImageUrl
                ? "text-accent-violet bg-accent-gradient-soft"
                : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <ImagePlus size={13} />
            {uploading ? "Uploading…" : referenceImageUrl ? "Reference added" : "Add reference"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelected}
              disabled={loading || uploading}
            />
          </label>

          {referencePreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referencePreview}
                alt="Reference"
                className="w-9 h-9 rounded-lg object-cover border border-white/10"
              />
              <button
                type="button"
                onClick={clearReference}
                aria-label="Remove reference image"
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black flex items-center justify-center text-white"
              >
                <X size={10} />
              </button>
            </motion.div>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={loading || uploading || !prompt.trim()}
          whileHover={{ scale: loading || !prompt.trim() ? 1 : 1.03 }}
          whileTap={{ scale: loading || !prompt.trim() ? 1 : 0.97 }}
          className="flex items-center gap-1.5 rounded-xl bg-accent-gradient disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 shadow-glow-sm transition-opacity"
        >
          <Wand2 size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Generating…" : "Generate"}
        </motion.button>
      </div>

      {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}
    </form>
  );
}
