"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { GlassCard, Button } from "@/components/ui/primitives";
import { AiUsageStats, getAiUsageStats } from "@/lib/admin";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

export default function AdminAiUsagePage() {
  const { user, checking } = useRequireAdmin();
  const [usage, setUsage] = useState<AiUsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    getAiUsageStats().then(setUsage).catch((err) => setError(err.message));
  }, [checking]);

  function exportCsv() {
    if (!usage) return;
    const rows = [
      ["metric", "model", "count"],
      ...usage.chatsByModel.map((c) => ["chats", c.model, String(c.count)]),
      ...usage.messagesByModel.map((m) => ["messages", m.model, String(m.count)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AdminShell user={user}>
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">AI Usage</h1>
            <p className="text-sm text-gray-400 mt-1">Model usage across the platform.</p>
          </div>
          <Button variant="ghost" onClick={exportCsv} disabled={!usage}>
            Export CSV
          </Button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {usage && (
          <>
            <GlassCard className="p-4">
              <h2 className="text-sm font-semibold text-white mb-4">Messages by model</h2>
              {usage.messagesByModel.length === 0 ? (
                <p className="text-sm text-gray-500">No messages yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usage.messagesByModel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="model" stroke="#9ca3af" fontSize={11} />
                      <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "#0a0a12", border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-4">
              <h2 className="text-sm font-semibold text-white mb-4">Chats by model</h2>
              {usage.chatsByModel.length === 0 ? (
                <p className="text-sm text-gray-500">No chats yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usage.chatsByModel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="model" stroke="#9ca3af" fontSize={11} />
                      <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "#0a0a12", border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>
          </>
        )}

        <GlassCard className="p-4">
          <p className="text-xs text-gray-500">
            Daily/monthly usage trends and token usage aren't available yet — the backend
            doesn't record per-message token counts or timestamped usage buckets (only total
            counts grouped by model, from `GET /api/admin/ai-usage`). Adding either would need
            new fields on `Message` and a new aggregation endpoint — not part of Part 1's scope.
          </p>
        </GlassCard>
      </div>
    </AdminShell>
  );
}
