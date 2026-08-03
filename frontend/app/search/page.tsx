"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { SearchBar } from "@/components/search/SearchBar";
import { HistoryList } from "@/components/ui/HistoryList";
import { SearchHistoryItem, listSearchHistory, runSearch } from "@/lib/search";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

// Suggested starting points — real queries that get actually searched on click, not
// pre-baked fake results.
const SUGGESTED_SEARCHES = [
  "What are today's top tech headlines?",
  "Latest developments in renewable energy",
  "Compare the newest flagship smartphones",
  "What's happening in the stock market today",
];

export default function SearchPage() {
  const { user, checking } = useRequireAuth();
  const router = useRouter();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    listSearchHistory().then(setHistory).catch((err) => setError(err.message));
  }, [checking]);

  async function onSearch(query: string) {
    setError(null);
    setLoading(true);
    try {
      const result = await runSearch(query);
      router.push(`/search/${result.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AppShell user={user}>
      <div className="max-w-3xl mx-auto w-full px-6 py-12">
        <h1 className="text-2xl font-semibold text-white mb-2 text-center">AI Search</h1>
        <p className="text-sm text-gray-400 mb-8 text-center">
          Search the live web with AI-summarized, cited answers.
        </p>

        <SearchBar onSearch={onSearch} loading={loading} />
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        {history.length === 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-1.5 mb-2.5 justify-center">
              <Compass size={12} className="text-gray-500" />
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Try asking</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_SEARCHES.map((s) => (
                <button
                  key={s}
                  onClick={() => onSearch(s)}
                  disabled={loading}
                  className="text-xs rounded-full glass px-3.5 py-2 text-gray-300 hover:text-white hover:border-white/[0.15] border border-transparent transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Recent searches</h2>
          <HistoryList
            items={history.map((h) => ({
              id: h.id,
              label: h.query,
              meta: h.model,
              href: `/search/${h.id}`,
            }))}
            emptyText="No searches yet — ask something above."
          />
        </div>
      </div>
    </AppShell>
  );
}
