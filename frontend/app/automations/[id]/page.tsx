"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Workflow,
  ScrollText,
  Webhook,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { GlassCard, Button } from "@/components/ui/primitives";
import { AutomationRunHistory } from "@/components/automations/AutomationRunHistory";
import {
  Automation,
  AutomationRun,
  deleteAutomation,
  getAutomation,
  listAutomationRuns,
  runAutomationNow,
  updateAutomation,
  webhookUrl,
} from "@/lib/automations";

const STATUS_STYLE: Record<Automation["status"], string> = {
  ACTIVE: "text-green-400 bg-green-400/10",
  PAUSED: "text-yellow-400 bg-yellow-400/10",
  COMPLETED: "text-gray-400 bg-white/[0.06]",
};

export default function AutomationDetailPage() {
  const { user, checking } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const [a, r] = await Promise.all([getAutomation(params.id), listAutomationRuns(params.id)]);
    setAutomation(a);
    setRuns(r);
  }

  useEffect(() => {
    if (checking) return;
    refresh().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, params.id]);

  async function onRunNow() {
    setRunning(true);
    setError(null);
    try {
      await runAutomationNow(params.id);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  async function onToggleStatus() {
    if (!automation) return;
    setToggling(true);
    try {
      const nextStatus = automation.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const updated = await updateAutomation(automation.id, { status: nextStatus });
      setAutomation(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setToggling(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await deleteAutomation(params.id);
      router.push("/automations");
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  function copyWebhook() {
    if (!automation?.webhookToken) return;
    navigator.clipboard.writeText(webhookUrl(automation.webhookToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (checking || !automation) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 gap-2">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
        <Link
          href="/automations"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          Back to Automation
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center shrink-0">
              <Workflow size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-white tracking-tight truncate">{automation.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-400">{automation.type}</p>
                <span className={`text-[11px] font-medium rounded-md px-1.5 py-0.5 ${STATUS_STYLE[automation.status]}`}>
                  {automation.status.charAt(0) + automation.status.slice(1).toLowerCase()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {automation.status !== "COMPLETED" && (
              <Button
                variant="ghost"
                onClick={onToggleStatus}
                disabled={toggling}
                className="flex items-center gap-1.5"
              >
                {automation.status === "ACTIVE" ? <Pause size={13} /> : <Play size={13} />}
                {automation.status === "ACTIVE" ? "Pause" : "Resume"}
              </Button>
            )}
            <Button onClick={onRunNow} disabled={running} className="flex items-center gap-1.5">
              {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {running ? "Running…" : "Run now"}
            </Button>
            <Button
              variant="ghost"
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300"
            >
              <Trash2 size={13} />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </motion.div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <GlassCard>
          <div className="flex items-center gap-2 mb-2.5">
            <ScrollText size={15} className="text-accent-violet" />
            <h2 className="text-sm font-semibold text-white">Task</h2>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{automation.prompt}</p>
        </GlassCard>

        {automation.type === "TRIGGER" && automation.webhookToken && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-2.5">
              <Webhook size={15} className="text-accent-violet" />
              <h2 className="text-sm font-semibold text-white">Webhook URL</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              POST to this URL from any external service to run this automation. Treat it as a
              secret — anyone with the URL can trigger it.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2 text-gray-300 overflow-x-auto">
                {webhookUrl(automation.webhookToken)}
              </code>
              <Button variant="ghost" onClick={copyWebhook} className="shrink-0 flex items-center gap-1.5">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </GlassCard>
        )}

        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Run history</h2>
          <AutomationRunHistory runs={runs} />
        </div>
      </div>
    </AppShell>
  );
}
