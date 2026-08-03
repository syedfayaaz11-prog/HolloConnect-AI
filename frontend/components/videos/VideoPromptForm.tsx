"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Wand2, ImagePlus, Film, X } from "lucide-react";
import { uploadVideoSource, uploadVideoSourceVideo } from "@/lib/videos";

type ReferenceKind = "image" | "video";

export function VideoPromptForm({
  onGenerate,
  loading,
  prompt: controlledPrompt,
  onPromptChange,
}: {
  onGenerate: (prompt: string, sourceImageUrl?: string, sourceVideoUrl?: string) => void;
  loading: boolean;
  prompt?: string;
  onPromptChange?: (value: string) => void;
}) {
  const [internalPrompt, setInternalPrompt] = useState("");
  // Only one reference at a time (image-to-video XOR video-to-video) — `kind` tracks which
  // slot is currently populated so submit knows which field to send.
  const [referenceKind, setReferenceKind] = useState<ReferenceKind | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const prompt = controlledPrompt ?? internalPrompt;

  function setPrompt(value: string) {
    if (onPromptChange) onPromptChange(value);
    else setInternalPrompt(value);
  }

  async function handleFile(file: File, kind: ReferenceKind) {
    setError(null);
    setUploading(true);
    setReferenceKind(kind);
    setSourcePreview(URL.createObjectURL(file));
    try {
      const url = kind === "image" ? await uploadVideoSource(file) : await uploadVideoSourceVideo(file);
      setSourceUrl(url);
    } catch (err) {
      setError((err as Error).message);
      setSourcePreview(null);
      setReferenceKind(null);
    } finally {
      setUploading(false);
    }
  }

  async function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await handleFile(file, "image");
  }

  async function onVideoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await handleFile(file, "video");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (loading || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) handleFile(file, "image");
    else if (file.type.startsWith("video/")) handleFile(file, "video");
  }

  function clearSource() {
    setSourceUrl(null);
    setSourcePreview(null);
    setReferenceKind(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading || uploading) return;
    onGenerate(
      prompt.trim(),
      referenceKind === "image" ? sourceUrl ?? undefined : undefined,
      referenceKind === "video" ? sourceUrl ?? undefined : undefined
    );
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
            ? "Drop an image or video to animate…"
            : "Describe the video you want to create…"
        }
        disabled={loading}
        className="w-full resize-none bg-transparent text-sm text-gray-100 placeholder:text-gray-500 outline-none leading-relaxed"
      />

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06] flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <label
            className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
              referenceKind === "image"
                ? "text-accent-violet bg-accent-gradient-soft"
                : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <ImagePlus size={13} />
            {uploading && referenceKind === "image" ? "Uploading…" : "Add source image"}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImageSelected}
              disabled={loading || uploading}
            />
          </label>

          <label
            className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
              referenceKind === "video"
                ? "text-accent-violet bg-accent-gradient-soft"
                : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <Film size={13} />
            {uploading && referenceKind === "video" ? "Uploading…" : "Add source video"}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={onVideoSelected}
              disabled={loading || uploading}
            />
          </label>

          <span className="hidden sm:inline text-[10px] text-gray-600">or drag & drop either</span>

          {sourcePreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              {referenceKind === "video" ? (
                <video src={sourcePreview} className="w-9 h-9 rounded-lg object-cover border border-white/10" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sourcePreview} alt="Source" className="w-9 h-9 rounded-lg object-cover border border-white/10" />
              )}
              <button
                type="button"
                onClick={clearSource}
                aria-label="Remove reference"
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
          <Wand2 size={14} />
          {loading ? "Starting…" : "Generate"}
        </motion.button>
      </div>

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </form>
  );
}
