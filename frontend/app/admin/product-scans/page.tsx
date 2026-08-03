"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GlassCard, Input } from "@/components/ui/primitives";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

/**
 * Product Scan Analytics — reusable UI built ahead of the backend, per explicit instruction
 * ("Backend only exists later. Prepare reusable UI now."). Every stat/list here is a real,
 * styled, structurally-complete component wired to accept real data — there's just no
 * Product Scan module (schema/service/routes) yet to fetch it from. Nothing is fabricated:
 * cards show "—" rather than invented numbers.
 */
export default function AdminProductScansPage() {
  const { user, checking } = useRequireAdmin();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AdminShell user={user}>
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Product Scan Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">
            The Product Scan module itself hasn't been built yet — this page is the reusable UI
            shell for when it is, not connected to any data source.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AdminStatCard label="Total Scans" value="—" />
          <AdminStatCard label="Popular Brand" value="—" />
          <AdminStatCard label="Top Category" value="—" />
          <AdminStatCard label="Avg Health Score" value="—" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scanned products…"
            disabled
            className="max-w-xs"
          />
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Filter by category…"
            disabled
            className="max-w-xs"
          />
        </div>

        <GlassCard className="p-4">
          <h2 className="text-sm font-semibold text-white mb-2">Popular brands</h2>
          <p className="text-sm text-gray-500">No data — Product Scan module not built.</p>
        </GlassCard>

        <GlassCard className="p-4">
          <h2 className="text-sm font-semibold text-white mb-2">Product categories</h2>
          <p className="text-sm text-gray-500">No data — Product Scan module not built.</p>
        </GlassCard>
      </div>
    </AdminShell>
  );
}
