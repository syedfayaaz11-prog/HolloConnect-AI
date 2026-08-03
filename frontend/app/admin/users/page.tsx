"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { GlassCard, Input } from "@/components/ui/primitives";
import { AdminUser, listUsers, setUserActive, deleteUser, updateUserRole } from "@/lib/admin";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { user: currentUser, checking } = useRequireAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"" | "USER" | "ADMIN">("");
  const [isActive, setIsActive] = useState<"" | "true" | "false">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function refresh(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers({
        query: query || undefined,
        role: role || undefined,
        isActive: isActive === "" ? undefined : isActive === "true",
        page: targetPage,
        pageSize: PAGE_SIZE,
      });
      setUsers(result.users);
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
  }, [checking, query, role, isActive]);

  async function onToggleActive(u: AdminUser) {
    setActioningId(u.id);
    setError(null);
    try {
      const updated = await setUserActive(u.id, !u.isActive);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: updated.isActive } : x)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActioningId(null);
    }
  }

  async function onChangeRole(u: AdminUser, role: "USER" | "ADMIN") {
    setActioningId(u.id);
    setError(null);
    try {
      const updated = await updateUserRole(u.id, role);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: updated.role } : x)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActioningId(null);
    }
  }

  async function onDelete(u: AdminUser) {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    setActioningId(u.id);
    setError(null);
    try {
      await deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActioningId(null);
    }
  }

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AdminShell user={currentUser}>
      <div className="max-w-5xl mx-auto w-full px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Users</h1>
          <p className="text-sm text-gray-400 mt-1">
            Search, filter, manage status, change roles, and delete accounts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or name…"
            className="max-w-xs"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "" | "USER" | "ADMIN")}
            className="glass rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent-purple/60"
          >
            <option value="" className="bg-[#0a0a12]">All roles</option>
            <option value="USER" className="bg-[#0a0a12]">User</option>
            <option value="ADMIN" className="bg-[#0a0a12]">Admin</option>
          </select>
          <select
            value={isActive}
            onChange={(e) => setIsActive(e.target.value as "" | "true" | "false")}
            className="glass rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent-purple/60"
          >
            <option value="" className="bg-[#0a0a12]">All statuses</option>
            <option value="true" className="bg-[#0a0a12]">Active</option>
            <option value="false" className="bg-[#0a0a12]">Disabled</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <GlassCard className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-white/10">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="text-gray-200 hover:text-accent-purple transition">
                      {u.email}
                    </Link>
                    {u.name && <p className="text-xs text-gray-500">{u.name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => onChangeRole(u, e.target.value as "USER" | "ADMIN")}
                      disabled={actioningId === u.id || u.id === currentUser?.id}
                      title={u.id === currentUser?.id ? "Can't change your own role" : undefined}
                      className="bg-transparent text-gray-400 text-sm focus:outline-none disabled:opacity-40"
                    >
                      <option value="USER" className="bg-[#0a0a12]">User</option>
                      <option value="ADMIN" className="bg-[#0a0a12]">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.isActive ? "text-green-400" : "text-red-400"}>
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onToggleActive(u)}
                        disabled={actioningId === u.id || u.id === currentUser?.id}
                        title={u.id === currentUser?.id ? "Can't change your own status" : undefined}
                        className="text-xs text-gray-400 hover:text-white transition disabled:opacity-40"
                      >
                        {u.isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => onDelete(u)}
                        disabled={actioningId === u.id || u.id === currentUser?.id}
                        title={u.id === currentUser?.id ? "Can't delete your own account" : undefined}
                        className="text-xs text-gray-400 hover:text-red-400 transition disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && users.length === 0 && (
            <p className="text-sm text-gray-500 p-6 text-center">No users match these filters.</p>
          )}
        </GlassCard>

        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={refresh} loading={loading} />
      </div>
    </AdminShell>
  );
}
