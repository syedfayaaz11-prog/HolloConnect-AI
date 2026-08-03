"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { GlassCard, Input } from "@/components/ui/primitives";
import { AdminAgent, listAllAgents, setAgentEnabled } from "@/lib/admin";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const PAGE_SIZE = 20;

export default function AdminAgentsPage() {
  const { user, checking } = useRequireAdmin();
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const result = await listAllAgents(query || undefined, targetPage, PAGE_SIZE);
      setAgents(result.agents);
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checking) return;
    const timeout = setTimeout(() => refresh(1), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, query]);

  async function onToggleEnabled(a: AdminAgent) {
    try {
      const updated = await setAgentEnabled(a.id, !a.enabled);
      setAgents((prev) => prev.map((x) => (x.id === a.id ? { ...x, enabled: updated.enabled } : x)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AdminShell user={user}>
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">AI Agents</h1>
          <p className="text-sm text-gray-400 mt-1">Platform-wide list of every user's agents.</p>
        </div>

        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search agents by name…" />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-3">
          {agents.map((a) => (
            <GlassCard key={a.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-200">{a.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.user.email} · {a.model} · {a._count.runs} run{a._count.runs === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={a.enabled ? "text-green-400 text-xs" : "text-red-400 text-xs"}>
                    {a.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    onClick={() => onToggleEnabled(a)}
                    className="text-xs text-gray-400 hover:text-white transition"
                  >
                    {a.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    className="text-xs text-gray-400 hover:text-white transition"
                  >
                    {expandedId === a.id ? "Hide" : "View config"}
                  </button>
                </div>
              </div>

              {expandedId === a.id && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  {a.description && <p className="text-xs text-gray-400">{a.description}</p>}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tools ({a.tools.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.tools.map((t) => (
                        <span key={t} className="text-[10px] rounded-full bg-white/5 px-2 py-0.5 text-gray-400">
                          {t}
                        </span>
                      ))}
                      {a.tools.length === 0 && <span className="text-xs text-gray-500">No tools enabled</span>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Max steps per run: {a.maxSteps}</p>
                  <p className="text-xs text-gray-500">
                    Status: {a.status} · Created {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </GlassCard>
          ))}
          {!loading && agents.length === 0 && (
            <p className="text-sm text-gray-500 text-center p-6">No agents match this search.</p>
          )}
        </div>

        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={refresh} loading={loading} />
      </div>
    </AdminShell>
  );
}
