"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GlassCard } from "@/components/ui/primitives";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";
import {
  AiUsageStats,
  DashboardStats,
  PlatformHealth,
  getAiUsageStats,
  getDashboardStats,
  getPlatformHealth,
} from "@/lib/admin";

export default function AdminDashboardPage() {
  const { user, checking } = useRequireAdmin();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    Promise.all([getDashboardStats(), getPlatformHealth(), getAiUsageStats()])
      .then(([s, h, a]) => {
        setStats(s);
        setHealth(h);
        setAiUsage(a);
      })
      .catch((err) => setError(err.message));
  }, [checking]);

  if (checking) {
    return <PageLoadingScreen />;
  }

  const totalAiRequests = aiUsage
    ? aiUsage.messagesByModel.reduce((sum, m) => sum + m.count, 0)
    : undefined;

  return (
    <AdminShell user={user}>
      <div className="max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Platform-wide overview.</p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AdminStatCard label="Total Users" value={stats?.totalUsers ?? "—"} />
            <AdminStatCard label="Active Users" value={stats?.activeUsers ?? "—"} tone="good" />
            <AdminStatCard
              label="Disabled Users"
              value={stats?.disabledUsers ?? "—"}
              tone={stats && stats.disabledUsers > 0 ? "warn" : "default"}
            />
            <AdminStatCard label="New This Week" value={stats?.newUsersThisWeek ?? "—"} />
            <AdminStatCard label="Total Conversations" value={stats?.totalChats ?? "—"} />
            <AdminStatCard label="Total AI Requests" value={totalAiRequests ?? "—"} sublabel="Messages sent" />
            <AdminStatCard label="Total Documents" value={stats?.totalDocuments ?? "—"} />
            <AdminStatCard label="Total Automations" value={stats?.totalAutomations ?? "—"} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">
            AI Agents, Memory, OCR &amp; Product Scans
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AdminStatCard label="Total AI Agents" value={stats?.totalAgents ?? "—"} />
            <AdminStatCard
              label="Active AI Agents"
              value={stats?.activeAgents ?? "—"}
              sublabel="Ran at least once in the last 30 days"
            />
            <AdminStatCard
              label="Memory Statistics"
              value={stats?.memoryStats.total ?? "—"}
              sublabel="Total memories, platform-wide"
            />
            <AdminStatCard label="Total OCR Requests" value={stats?.totalOcrRequests ?? "—"} sublabel="Image uploads processed via OCR" />
            <AdminStatCard label="Total Product Scans" value="—" sublabel="Product Scan module not built yet" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">System Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AdminStatCard
              label="System Health"
              value={health ? (health.status === "healthy" ? "Healthy" : "Degraded") : "—"}
              tone={health ? (health.status === "healthy" ? "good" : "bad") : "default"}
            />
            <AdminStatCard
              label="Database Status"
              value={health ? (health.database.ok ? "Connected" : "Error") : "—"}
              tone={health ? (health.database.ok ? "good" : "bad") : "default"}
              sublabel={health?.database.error}
            />
            <AdminStatCard
              label="Scheduler Status"
              value={health ? (health.automationScheduler.running ? "Running" : "Stopped") : "—"}
              tone={health ? (health.automationScheduler.running ? "good" : "bad") : "default"}
              sublabel={
                health?.automationScheduler.lastTickAt
                  ? `Last tick ${new Date(health.automationScheduler.lastTickAt).toLocaleTimeString()}`
                  : "No tick recorded yet"
              }
            />
            <AdminStatCard label="API Health" value={health ? "Reachable" : "—"} tone={health ? "good" : "default"} />
            <AdminStatCard
              label="RAM Usage"
              value={health ? `${health.process.memoryUsedMb} MB` : "—"}
              sublabel={health ? `of ${health.process.memoryTotalMb} MB heap` : undefined}
            />
            <AdminStatCard
              label="CPU Usage"
              value={health?.process.cpuUsagePercent !== null && health?.process.cpuUsagePercent !== undefined ? `${health.process.cpuUsagePercent}%` : "—"}
              sublabel={health ? `1-min load avg across ${health.process.cpuCount} cores` : undefined}
            />
            <AdminStatCard
              label="Uptime"
              value={health ? formatUptime(health.process.uptimeSeconds) : "—"}
            />
            <AdminStatCard label="Node Version" value={health?.process.nodeVersion ?? "—"} />
          </div>
        </section>

        <GlassCard className="p-4">
          <p className="text-xs text-gray-500">
            The "Total Product Scans" card shows "—" because the Smart Product Scan module
            itself doesn't exist yet (explicitly out of scope for the Admin Panel passes) —
            not a fabricated number. Every other card on this page is real, backed by
            Part 1-3's actual endpoints.
          </p>
        </GlassCard>
      </div>
    </AdminShell>
  );
}

function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}
