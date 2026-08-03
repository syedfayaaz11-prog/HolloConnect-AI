"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { GlassCard, Input } from "@/components/ui/primitives";
import { AuditLogEntry, getAuditLogs } from "@/lib/admin";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const PAGE_SIZE = 25;

const ACTION_LABEL: Record<AuditLogEntry["action"], string> = {
  USER_ENABLED: "Enabled user",
  USER_DISABLED: "Disabled user",
  USER_DELETED: "Deleted user",
  USER_ROLE_CHANGED: "Changed user role",
};

export default function AdminAuditLogsPage() {
  const { user, checking } = useRequireAdmin();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuditLogs(targetPage, PAGE_SIZE);
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

  const filtered = query.trim()
    ? logs.filter(
        (l) =>
          l.actor.email.toLowerCase().includes(query.toLowerCase()) ||
          l.targetId.toLowerCase().includes(query.toLowerCase()) ||
          ACTION_LABEL[l.action].toLowerCase().includes(query.toLowerCase())
      )
    : logs;

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AdminShell user={user}>
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Audit Logs</h1>
          <p className="text-sm text-gray-400 mt-1">
            Admin actions on user accounts. Search filters the current page only — pagination
            is server-side.
          </p>
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter this page by actor, action, or target id…"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <GlassCard className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-white/10">
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-gray-200">{log.actor.email}</td>
                  <td className="px-4 py-3 text-gray-300">{ACTION_LABEL[log.action]}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {log.targetType} · {log.targetId.slice(0, 8)}
                    {log.metadata && "email" in log.metadata && (
                      <span className="ml-1">({String(log.metadata.email)})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-500 p-6 text-center">No audit log entries yet.</p>
          )}
        </GlassCard>

        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={refresh} loading={loading} />
      </div>
    </AdminShell>
  );
}
