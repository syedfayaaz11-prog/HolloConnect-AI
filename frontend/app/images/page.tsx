"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Sparkles, LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ImagePromptForm } from "@/components/images/ImagePromptForm";
import { ImageCard } from "@/components/images/ImageCard";
import { InspirationGrid } from "@/components/studio/InspirationGrid";
import { IMAGE_INSPIRATION } from "@/lib/inspiration";
import { GeneratedImage, ImageSize, generateImage, listImages } from "@/lib/images";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

export default function ImagesPage() {
  const { user, checking } = useRequireAuth();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (checking) return;
    listImages()
      .then(setImages)
      .catch((err) => setError(err.message))
      .finally(() => setInitialLoading(false));
  }, [checking]);

  async function onGenerate(promptText: string, size: ImageSize, referenceImageUrl?: string) {
    setError(null);
    setLoading(true);
    try {
      const image = await generateImage(promptText, size, referenceImageUrl);
      setImages((prev) => [image, ...prev]);
      setPrompt("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function onDeleted(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  function useInspirationPrompt(p: string) {
    setPrompt(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (checking) {
    return <PageLoadingScreen />;
  }

  const hasCreations = !initialLoading && images.length > 0;

  return (
    <AppShell user={user}>
      <div className="max-w-5xl mx-auto w-full px-6 py-8 min-h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center">
            <ImageIcon size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Image AI</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Sparkles size={11} className="text-accent-violet" />
              Text-to-image & image-to-image generation
            </p>
          </div>
        </motion.div>

        <ImagePromptForm onGenerate={onGenerate} loading={loading} prompt={prompt} onPromptChange={setPrompt} />
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        {(loading || hasCreations || initialLoading) && (
          <div className="mt-8">
            {hasCreations && (
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid size={13} className="text-gray-500" />
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Your Creations</h2>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {loading && (
                <div className="glass rounded-xl2 aspect-square flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
                  <p className="text-[11px] text-gray-500">Generating…</p>
                </div>
              )}

              {initialLoading &&
                [0, 1, 2, 3].map((i) => (
                  <div key={i} className="skeleton animate-shimmer rounded-xl2 aspect-square" />
                ))}

              <AnimatePresence mode="popLayout">
                {images.map((img) => (
                  <ImageCard key={img.id} image={img} onDeleted={onDeleted} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Inspiration is always available — this is what replaces the old huge empty box
            when there's nothing generated yet, and stays around (in a smaller form) once
            there is, per the redesign spec's "every module needs samples" requirement.
            These are example prompts, not generated content or user history. */}
        {!initialLoading && (
          <div className={hasCreations ? "mt-10" : "mt-8"}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {hasCreations ? "More Inspiration" : "Inspiration"}
              </h2>
              {!hasCreations && (
                <p className="text-[11px] text-gray-500">Tap a style to start with that prompt</p>
              )}
            </div>
            <InspirationGrid items={IMAGE_INSPIRATION} onUse={useInspirationPrompt} compact={hasCreations} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
