"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GlassCard, Input, Button } from "@/components/ui/primitives";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";
import {
  AdminMemory,
  deleteAnyMemory,
  getDashboardStats,
  listAllMemories,
  updateAnyMemory,
} from "@/lib/admin";

const PAGE_SIZE = 20;

export default function AdminMemoryPage() {
  const { user, checking } = useRequireAdmin();
  const [memories, setMemories] = useState<AdminMemory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [memoryTotal, setMemoryTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  async function refresh(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const result = await listAllMemories({ query: query || undefined, page: targetPage, pageSize: PAGE_SIZE });
      setMemories(result.memories);
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
    getDashboardStats().then((s) => setMemoryTotal(s.memoryStats.total)).catch(() => {});
    const timeout = setTimeout(() => refresh(1), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, query]);

  async function onTogglePin(m: AdminMemory) {
    try {
      const updated = await updateAnyMemory(m.id, { pinned: !m.pinned });
      setMemories((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: updated.pinned } : x)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onSaveEdit(id: string) {
    try {
      const updated = await updateAnyMemory(id, { content: editContent });
      setMemories((prev) => prev.map((x) => (x.id === id ? { ...x, content: updated.content } : x)));
      setEditingId(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this memory?")) return;
    try {
      await deleteAnyMemory(id);
      setMemories((prev) => prev.filter((x) => x.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
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
          <h1 className="text-xl font-semibold text-white">Memory</h1>
          <p className="text-sm text-gray-400 mt-1">Platform-wide view across every user's memories.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <AdminStatCard label="Total Memories" value={memoryTotal ?? "—"} />
          <AdminStatCard label="Showing" value={memories.length} sublabel={`of ${total} matching`} />
        </div>

        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all users' memories…" />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-3">
          {memories.map((m) => (
            <GlassCard key={m.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-blue-300 font-medium">{m.type}</span>
                  <span>· {m.user.email}</span>
                  {m.pinned && <span className="text-accent-purple">📌</span>}
                </div>
                <span className="text-xs text-gray-500">{new Date(m.updatedAt).toLocaleDateString()}</span>
              </div>

              {editingId === m.id ? (
                <div className="space-y-2">
                  <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                  <div className="flex gap-2">
                    <Button onClick={() => onSaveEdit(m.id)}>Save</Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{m.content}</p>
              )}

              {!editingId && (
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => {
                      setEditingId(m.id);
                      setEditContent(m.content);
                    }}
                    className="text-xs text-gray-400 hover:text-white transition"
                  >
                    Edit
                  </button>
                  <button onClick={() => onTogglePin(m)} className="text-xs text-gray-400 hover:text-white transition">
                    {m.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button onClick={() => onDelete(m.id)} className="text-xs text-gray-400 hover:text-red-400 transition">
                    Delete
                  </button>
                </div>
              )}
            </GlassCard>
          ))}
          {!loading && memories.length === 0 && (
            <p className="text-sm text-gray-500 text-center p-6">No memories match this search.</p>
          )}
        </div>

        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={refresh} loading={loading} />
      </div>
    </AdminShell>
  );
}
