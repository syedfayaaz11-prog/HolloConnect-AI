"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { GlassCard, Input } from "@/components/ui/primitives";
import { AdminConversation, listAllConversations } from "@/lib/admin";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const PAGE_SIZE = 25;

export default function AdminConversationsPage() {
  const { user, checking } = useRequireAdmin();
  const [chats, setChats] = useState<AdminConversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const result = await listAllConversations(query || undefined, targetPage, PAGE_SIZE);
      setChats(result.chats);
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

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AdminShell user={user}>
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Conversations</h1>
          <p className="text-sm text-gray-400 mt-1">
            Platform-wide, metadata only — titles and message counts, not conversation content.
            Reading another user's actual messages is a deliberate privacy line this panel
            doesn't cross.
          </p>
        </div>

        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title…" />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <GlassCard className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-white/10">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Messages</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {chats.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-gray-200">
                    {c.title} {c.pinned && <span className="text-accent-purple">📌</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.user.email}</td>
                  <td className="px-4 py-3 text-gray-500">{c.model}</td>
                  <td className="px-4 py-3 text-gray-500">{c._count.messages}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(c.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && chats.length === 0 && (
            <p className="text-sm text-gray-500 p-6 text-center">No conversations match this search.</p>
          )}
        </GlassCard>

        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={refresh} loading={loading} />
      </div>
    </AdminShell>
  );
}
