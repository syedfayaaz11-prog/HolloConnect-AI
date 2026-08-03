"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { SearchBar } from "@/components/search/SearchBar";
import { AnswerPanel } from "@/components/search/AnswerPanel";
import { SourceList } from "@/components/search/SourceList";
import { FollowUpChips } from "@/components/search/FollowUpChips";
import { SearchRecord, getSearch, runSearch } from "@/lib/search";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

export default function SearchResultPage() {
  const { user, checking } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<SearchRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (checking) return;
    setError(null);
    getSearch(params.id)
      .then(setRecord)
      .catch((err) => setError(err.message));
  }, [checking, params.id]);

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
      <div className="max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
        <SearchBar onSearch={onSearch} loading={loading} />

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!record && !error && (
          <div className="space-y-4 animate-pulse">
            <div className="glass rounded-xl2 h-6 w-2/3" />
            <div className="glass rounded-xl2 h-40" />
          </div>
        )}

        {record && (
          <>
            <h1 className="text-xl font-semibold text-white">{record.query}</h1>
            <AnswerPanel answer={record.answer} model={record.model} />
            <SourceList sources={record.sources} />
            <FollowUpChips questions={record.followUps} onSelect={onSearch} />
          </>
        )}
      </div>
    </AppShell>
  );
}
