"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { GlassCard, Input } from "@/components/ui/primitives";
import { AdminDocument, listAllDocuments } from "@/lib/admin";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const PAGE_SIZE = 25;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const STATUS_STYLE: Record<AdminDocument["status"], string> = {
  PROCESSING: "text-yellow-400",
  READY: "text-green-400",
  FAILED: "text-red-400",
};

export default function AdminOcrJobsPage() {
  const { user, checking } = useRequireAdmin();
  const [jobs, setJobs] = useState<AdminDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const result = await listAllDocuments({
        query: query || undefined,
        onlyOcr: true,
        page: targetPage,
        pageSize: PAGE_SIZE,
      });
      setJobs(result.documents);
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
          <h1 className="text-xl font-semibold text-white">OCR Jobs</h1>
          <p className="text-sm text-gray-400 mt-1">
            Image uploads processed through OCR — this is the Documents list filtered to image
            mimetypes, since OCR isn't tracked as a separate record type (an OCR'd image is
            just a Document row with no dedicated flag; see PROJECT_PROGRESS.md).
          </p>
        </div>

        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by filename…" />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <GlassCard className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-white/10">
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Processed</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((d) => (
                <tr key={d.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <a
                      href={d.fileUrl.startsWith("http") ? d.fileUrl : `${API_URL}${d.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-200 hover:text-accent-purple transition"
                    >
                      {d.filename}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{d.user.email}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_STYLE[d.status]}>{d.status}</span>
                    {d.error && <p className="text-xs text-red-400 mt-0.5">{d.error}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.mimeType}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(d.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && jobs.length === 0 && (
            <p className="text-sm text-gray-500 p-6 text-center">No OCR jobs match this search.</p>
          )}
        </GlassCard>

        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={refresh} loading={loading} />
      </div>
    </AdminShell>
  );
}
