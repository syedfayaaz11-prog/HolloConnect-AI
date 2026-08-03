"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { GlassCard, Button, Input } from "@/components/ui/primitives";
import { HistoryList } from "@/components/ui/HistoryList";
import { ResearchHistoryItem, listResearchHistory, runResearch } from "@/lib/research";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const LOADING_STEPS = [
  "Planning sub-questions…",
  "Searching the live web…",
  "Reading through sources…",
  "Synthesizing the report…",
];

const SUGGESTED_TOPICS = [
  "The current state of quantum computing",
  "How AI regulation differs across major countries",
  "The economics of renewable energy adoption",
  "Emerging trends in remote work culture",
];

export default function ResearchPage() {
  const { user, checking } = useRequireAuth();
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    listResearchHistory().then(setHistory).catch((err) => setError(err.message));
  }, [checking]);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  async function submitTopic(value: string) {
    if (!value.trim() || loading) return;
    setError(null);
    setLoading(true);
    setLoadingStep(0);
    try {
      const report = await runResearch(value.trim());
      router.push(`/research/${report.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submitTopic(topic);
  }

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AppShell user={user}>
      <div className="max-w-3xl mx-auto w-full px-6 py-12">
        <h1 className="text-2xl font-semibold text-white mb-2 text-center">Deep Research</h1>
        <p className="text-sm text-gray-400 mb-8 text-center">
          Multi-step research with live sources, citations, and a full report.
        </p>

        <form onSubmit={onSubmit} className="glass rounded-xl2 p-2 flex items-center gap-2">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want researched?"
            className="border-none bg-transparent focus:ring-0"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !topic.trim()}>
            {loading ? "Researching…" : "Research"}
          </Button>
        </form>

        {loading && (
          <GlassCard className="mt-4 p-4">
            <p className="text-sm text-gray-300">{LOADING_STEPS[loadingStep]}</p>
            <p className="text-xs text-gray-500 mt-1">
              This can take up to a minute — gathering and reading multiple sources.
            </p>
          </GlassCard>
        )}

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        {history.length === 0 && !loading && (
          <div className="mt-6">
            <div className="flex items-center gap-1.5 mb-2.5 justify-center">
              <Compass size={12} className="text-gray-500" />
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Suggested topics</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_TOPICS.map((s) => (
                <button
                  key={s}
                  onClick={() => submitTopic(s)}
                  className="text-xs rounded-full glass px-3.5 py-2 text-gray-300 hover:text-white hover:border-white/[0.15] border border-transparent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Past research</h2>
          <HistoryList
            items={history.map((h) => ({
              id: h.id,
              label: h.topic,
              meta: h.status === "COMPLETE" ? h.model : h.status.toLowerCase(),
              href: `/research/${h.id}`,
            }))}
            emptyText="No research reports yet — start one above."
          />
        </div>
      </div>
    </AppShell>
  );
}
