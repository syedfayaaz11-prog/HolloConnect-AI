"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button, Skeleton } from "@/components/ui/primitives";
import { CreateMemoryForm } from "@/components/memory/CreateMemoryForm";
import { MemoryFilterBar, MemoryFilterState } from "@/components/memory/MemoryFilterBar";
import { MemoryCard } from "@/components/memory/MemoryCard";
import { Memory, listMemories, searchMemories } from "@/lib/memory";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const PAGE_SIZE = 20;

const EMPTY_FILTERS: MemoryFilterState = {
  query: "",
  type: "",
  category: "",
  tag: "",
  pinnedOnly: false,
};

export default function MemoryPage() {
  const { user, checking } = useRequireAuth();
  const [filters, setFilters] = useState<MemoryFilterState>(EMPTY_FILTERS);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const apiFilters = {
        type: filters.type || undefined,
        category: filters.category || undefined,
        tag: filters.tag || undefined,
        pinned: filters.pinnedOnly || undefined,
        page: targetPage,
        pageSize: PAGE_SIZE,
      };
      const result = filters.query.trim()
        ? await searchMemories(filters.query.trim(), apiFilters)
        : await listMemories(apiFilters);
      setMemories(result.memories);
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    if (checking) return;
    const timeout = setTimeout(() => refresh(1), 250); // debounce search-as-you-type
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, filters]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AppShell user={user}>
      <div className="max-w-3xl mx-auto w-full px-6 py-8 space-y-6 min-h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center">
            <BrainCircuit size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Memory</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Sparkles size={11} className="text-accent-violet" />
              Facts, preferences, and summaries remembered across Chat, Agents, and Automation
            </p>
          </div>
        </motion.div>

        <p className="text-xs text-gray-500 -mt-2 leading-relaxed">
          These are facts and preferences saved during your conversations so future chats,
          agents, and automations can use that context. Pin the ones that matter most, or
          delete anything you'd rather forget.
        </p>

        <CreateMemoryForm onCreated={(m) => setMemories((prev) => [m, ...prev])} />

        <MemoryFilterBar filters={filters} onChange={setFilters} />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-3">
          {initialLoading &&
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[110px] rounded-xl2" />)}

          <AnimatePresence mode="popLayout">
            {memories.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                onUpdated={(updated) => setMemories((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                onDeleted={(id) => {
                  setMemories((prev) => prev.filter((x) => x.id !== id));
                  setTotal((prev) => Math.max(0, prev - 1));
                }}
              />
            ))}
          </AnimatePresence>

          {!initialLoading && !loading && memories.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-xl2 p-12 text-center"
            >
              <BrainCircuit size={28} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No memories match these filters.</p>
            </motion.div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              disabled={page <= 1 || loading}
              onClick={() => refresh(page - 1)}
              className="flex items-center gap-1.5"
            >
              <ChevronLeft size={14} />
              Previous
            </Button>
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages} · {total} total
            </span>
            <Button
              variant="ghost"
              disabled={page >= totalPages || loading}
              onClick={() => refresh(page + 1)}
              className="flex items-center gap-1.5"
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
