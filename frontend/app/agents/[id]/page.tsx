"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, ScrollText, BrainCircuit, Trash2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { GlassCard, Button } from "@/components/ui/primitives";
import { RunAgentForm } from "@/components/agents/RunAgentForm";
import { AgentRunHistory } from "@/components/agents/AgentRunHistory";
import { AgentStepTrace } from "@/components/agents/AgentStepTrace";
import { Agent, AgentRun, deleteAgent, getAgent, getAgentRun, listAgentRuns } from "@/lib/agents";

export default function AgentDetailPage() {
  const { user, checking } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    const [a, r] = await Promise.all([getAgent(params.id), listAgentRuns(params.id)]);
    setAgent(a);
    setRuns(r);
    if (r.length > 0) {
      const full = await getAgentRun(params.id, r[0].id);
      setSelectedRun((prev) => prev ?? full);
    }
  }

  useEffect(() => {
    if (checking) return;
    refresh().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, params.id]);

  async function onRunComplete(run: AgentRun) {
    setRuns((prev) => [run, ...prev]);
    setSelectedRun(run); // already includes steps — startAgentRun returns the full trace
    // Pick up the agent's IDLE status and any memory it saved during the run.
    getAgent(params.id).then(setAgent).catch(() => {});
  }

  async function onSelectRun(run: AgentRun) {
    // The run history list omits steps to keep that response small; fetch the full trace
    // only for the run the user actually opens.
    if (run.steps) {
      setSelectedRun(run);
      return;
    }
    try {
      const full = await getAgentRun(params.id, run.id);
      setSelectedRun(full);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await deleteAgent(params.id);
      router.push("/agents");
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  if (checking || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 gap-2">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          Back to AI Agents
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center shrink-0">
              <Bot size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-white tracking-tight truncate">{agent.name}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {agent.model} · {agent.tools.length} tool{agent.tools.length === 1 ? "" : "s"} · max{" "}
                {agent.maxSteps} steps/run
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onDelete}
            disabled={deleting}
            className="shrink-0 flex items-center gap-1.5 text-red-400 hover:text-red-300"
          >
            <Trash2 size={13} />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </motion.div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <GlassCard>
          <div className="flex items-center gap-2 mb-2.5">
            <ScrollText size={15} className="text-accent-violet" />
            <h2 className="text-sm font-semibold text-white">Instructions</h2>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{agent.instructions}</p>
          {agent.tools.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3.5">
              {agent.tools.map((t) => (
                <span
                  key={t}
                  className="text-xs rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-gray-300"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </GlassCard>

        {agent.memory.length > 0 && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-2.5">
              <BrainCircuit size={15} className="text-accent-violet" />
              <h2 className="text-sm font-semibold text-white">Saved memory</h2>
            </div>
            <div className="space-y-1.5">
              {agent.memory.map((m) => (
                <p key={m.key} className="text-xs text-gray-300 leading-relaxed">
                  <span className="text-gray-500">{m.key}:</span> {m.value}
                </p>
              ))}
            </div>
          </GlassCard>
        )}

        <RunAgentForm agentId={agent.id} disabled={agent.status === "RUNNING"} onRunComplete={onRunComplete} />

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-400 mb-3">Run history</h2>
            <AgentRunHistory runs={runs} onSelect={onSelectRun} selectedId={selectedRun?.id} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-400 mb-3">Step trace</h2>
            {selectedRun ? (
              <AgentStepTrace run={selectedRun} />
            ) : (
              <p className="text-sm text-gray-500">Select a run to see its step-by-step trace.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
