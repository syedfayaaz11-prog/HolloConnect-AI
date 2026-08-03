"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video as VideoIcon, Sparkles, LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useVideoStatusPolling } from "@/hooks/useVideoStatusPolling";
import { VideoPromptForm } from "@/components/videos/VideoPromptForm";
import { VideoCard } from "@/components/videos/VideoCard";
import { InspirationGrid } from "@/components/studio/InspirationGrid";
import { VIDEO_INSPIRATION } from "@/lib/inspiration";
import { VideoGeneration, generateVideo, listVideos } from "@/lib/videos";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

export default function VideosPage() {
  const { user, checking } = useRequireAuth();
  const [videos, setVideos] = useState<VideoGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (checking) return;
    listVideos()
      .then(setVideos)
      .catch((err) => setError(err.message))
      .finally(() => setInitialLoading(false));
  }, [checking]);

  useVideoStatusPolling(videos, (updated) => {
    setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  });

  async function onGenerate(promptText: string, sourceImageUrl?: string, sourceVideoUrl?: string) {
    setError(null);
    setLoading(true);
    try {
      const video = await generateVideo(promptText, sourceImageUrl, sourceVideoUrl);
      setVideos((prev) => [video, ...prev]);
      setPrompt("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function onDeleted(id: string) {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }

  function useInspirationPrompt(p: string) {
    setPrompt(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (checking) {
    return <PageLoadingScreen />;
  }

  const hasCreations = !initialLoading && videos.length > 0;

  return (
    <AppShell user={user}>
      <div className="max-w-5xl mx-auto w-full px-6 py-8 min-h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center">
            <VideoIcon size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Video AI</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Sparkles size={11} className="text-accent-violet" />
              Text-to-video and image-to-video
            </p>
          </div>
        </motion.div>
        <p className="text-sm text-gray-400 mb-6">
          Generation runs in the background — this page updates automatically when it's ready.
        </p>

        <VideoPromptForm onGenerate={onGenerate} loading={loading} prompt={prompt} onPromptChange={setPrompt} />
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        {(hasCreations || initialLoading) && (
          <div className="mt-8">
            {hasCreations && (
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid size={13} className="text-gray-500" />
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Your Creations</h2>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {initialLoading &&
                [0, 1, 2].map((i) => <div key={i} className="skeleton animate-shimmer rounded-xl2 aspect-video" />)}

              <AnimatePresence mode="popLayout">
                {videos.map((v) => (
                  <VideoCard key={v.id} video={v} onDeleted={onDeleted} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Motion templates — example prompts, not generated content. Text-to-video-only
            examples here (no source image), since a reference video upload isn't something
            the current backend/provider supports — see PROJECT_PROGRESS.md. */}
        {!initialLoading && (
          <div className={hasCreations ? "mt-10" : "mt-8"}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {hasCreations ? "More Inspiration" : "Motion Inspiration"}
              </h2>
              {!hasCreations && (
                <p className="text-[11px] text-gray-500">Tap a template to start with that prompt</p>
              )}
            </div>
            <InspirationGrid items={VIDEO_INSPIRATION} onUse={useInspirationPrompt} compact={hasCreations} kind="video" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
