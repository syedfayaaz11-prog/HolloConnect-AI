"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GlassCard, Button } from "@/components/ui/primitives";
import { AdminUserDetail, deleteUser, getUserDetails, setUserActive } from "@/lib/admin";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

export default function AdminUserDetailPage() {
  const { user: currentUser, checking } = useRequireAdmin();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    if (checking) return;
    getUserDetails(params.id)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [checking, params.id]);

  async function onToggleActive() {
    if (!detail) return;
    setActioning(true);
    try {
      const updated = await setUserActive(detail.id, !detail.isActive);
      setDetail({ ...detail, isActive: updated.isActive });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActioning(false);
    }
  }

  async function onDelete() {
    if (!detail) return;
    if (!confirm(`Delete ${detail.email}? This cannot be undone.`)) return;
    setActioning(true);
    try {
      await deleteUser(detail.id);
      router.push("/admin/users");
    } catch (err) {
      setError((err as Error).message);
      setActioning(false);
    }
  }

  if (checking || !detail) {
    return <PageLoadingScreen />;
  }

  const isSelf = detail.id === currentUser?.id;

  return (
    <AdminShell user={currentUser}>
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{detail.email}</h1>
            <p className="text-xs text-gray-500 mt-1">
              {detail.name ?? "No name set"} · {detail.role} · Joined{" "}
              {new Date(detail.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onToggleActive} disabled={actioning || isSelf}>
              {detail.isActive ? "Disable" : "Enable"}
            </Button>
            <Button variant="ghost" onClick={onDelete} disabled={actioning || isSelf}>
              Delete
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <span className={detail.isActive ? "text-green-400" : "text-red-400"}>
              {detail.isActive ? "● Active" : "● Disabled"}
            </span>
            <span className="text-xs text-gray-500">Default model: {detail.defaultModel}</span>
          </div>
          {isSelf && (
            <p className="text-xs text-gray-500 mt-2">
              This is your own account — status/delete actions are disabled here as a safety
              check enforced by the backend.
            </p>
          )}
        </GlassCard>

        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Usage</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AdminStatCard label="Conversations" value={detail._count.chats} />
            <AdminStatCard label="Projects" value={detail._count.projects} />
            <AdminStatCard label="Documents" value={detail._count.documents} />
            <AdminStatCard label="Images" value={detail._count.generatedImages} />
            <AdminStatCard label="Videos" value={detail._count.videoGenerations} />
            <AdminStatCard label="Automations" value={detail._count.automations} />
            <AdminStatCard label="AI Agents" value={detail._count.agents} />
            <AdminStatCard label="Memories" value={detail._count.memories} />
            <AdminStatCard label="Searches" value={detail._count.searchQueries} />
            <AdminStatCard label="Research Reports" value={detail._count.researchReports} />
          </div>
        </div>

        <GlassCard className="p-4">
          <p className="text-xs text-gray-500">
            Viewing this user's actual conversation/document/agent content (not just counts)
            requires per-record admin endpoints that don't exist yet — every existing
            content API is scoped to the requesting user's own account by design. These counts
            come from the real `GET /api/admin/users/:id` endpoint.
          </p>
        </GlassCard>
      </div>
    </AdminShell>
  );
}
