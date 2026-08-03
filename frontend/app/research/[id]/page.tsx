"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/primitives";
import { SourceList } from "@/components/search/SourceList";
import { FollowUpChips } from "@/components/search/FollowUpChips";
import { ResearchTimeline } from "@/components/research/ResearchTimeline";
import { ReportSections } from "@/components/research/ReportSections";
import { ResearchReport, downloadResearchPdf, getResearch, runResearch } from "@/lib/research";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

export default function ResearchDetailPage() {
  const { user, checking } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (checking) return;
    getResearch(params.id)
      .then(setReport)
      .catch((err) => setError(err.message));
  }, [checking, params.id]);

  async function onFollowUp(question: string) {
    setError(null);
    try {
      const newReport = await runResearch(question);
      router.push(`/research/${newReport.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onExport() {
    if (!report) return;
    setExporting(true);
    try {
      await downloadResearchPdf(report.id, report.topic);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AppShell user={user}>
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!report && !error && (
          <div className="space-y-4 animate-pulse">
            <div className="glass rounded-xl2 h-8 w-2/3" />
            <div className="glass rounded-xl2 h-40" />
          </div>
        )}

        {report && report.status === "FAILED" && (
          <div className="glass rounded-xl2 p-6">
            <h1 className="text-lg font-semibold text-white mb-2">{report.topic}</h1>
            <p className="text-sm text-red-400">Research failed: {report.error}</p>
          </div>
        )}

        {report && report.status === "COMPLETE" && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-white">{report.topic}</h1>
              <Button variant="ghost" onClick={onExport} disabled={exporting}>
                {exporting ? "Exporting…" : "Export PDF"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                {report.sections && <ReportSections sections={report.sections} />}
                {report.followUps && report.followUps.length > 0 && (
                  <FollowUpChips questions={report.followUps} onSelect={onFollowUp} />
                )}
              </div>
              <div className="space-y-4">
                {report.timeline && <ResearchTimeline steps={report.timeline} />}
                {report.sources && <SourceList sources={report.sources} />}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
