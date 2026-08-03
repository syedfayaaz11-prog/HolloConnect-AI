"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { GlassCard, Input } from "@/components/ui/primitives";
import { ErrorLogEntry, getErrorLogs } from "@/lib/admin";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const PAGE_SIZE = 25;

export default function AdminErrorLogsPage() {
  const { user, checking } = useRequireAdmin();
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const result = await getErrorLogs(targetPage, PAGE_SIZE);
      setLogs(result.logs);
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
    refresh(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking]);

  const methods = Array.from(new Set(logs.map((l) => l.method).filter(Boolean))) as string[];

  const filtered = logs.filter((l) => {
    if (methodFilter && l.method !== methodFilter) return false;
    if (query.trim() && !l.message.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AdminShell user={user}>
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Error Logs</h1>
          <p className="text-sm text-gray-400 mt-1">
            Real server errors (5xx), captured automatically by the global error handler.
            Client-side validation errors (4xx) aren't logged here — that's normal request
            handling, not a bug.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this page by message…"
            className="max-w-xs"
          />
          {methods.length > 0 && (
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent-purple/60"
            >
              <option value="" className="bg-[#0a0a12]">All methods</option>
              {methods.map((m) => (
                <option key={m} value={m} className="bg-[#0a0a12]">{m}</option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-2">
          {filtered.map((log) => (
            <GlassCard key={log.id} className="p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              >
                <div className="min-w-0">
                  <p className="text-sm text-red-400 truncate">{log.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {log.method && `${log.method} `}
                    {log.path && `${log.path} · `}
                    {log.statusCode && `${log.statusCode} · `}
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
                {log.stack && (
                  <span className="text-xs text-gray-500 shrink-0 ml-3">
                    {expandedId === log.id ? "Hide stack" : "Show stack"}
                  </span>
                )}
              </div>
              {expandedId === log.id && log.stack && (
                <pre className="text-[10px] text-gray-400 mt-3 overflow-x-auto whitespace-pre-wrap bg-black/30 rounded-lg p-3">
                  {log.stack}
                </pre>
              )}
            </GlassCard>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-500 p-6 text-center">No errors logged — good sign.</p>
          )}
        </div>

        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={refresh} loading={loading} />
      </div>
    </AdminShell>
  );
}
