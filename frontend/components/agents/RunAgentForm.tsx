"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Play, Loader2 } from "lucide-react";
import { GlassCard, Button } from "@/components/ui/primitives";
import { AgentRun, runAgent } from "@/lib/agents";

export function RunAgentForm({
  agentId,
  disabled,
  onRunComplete,
}: {
  agentId: string;
  disabled?: boolean;
  onRunComplete: (run: AgentRun) => void;
}) {
  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!task.trim() || running) return;
    setRunning(true);
    setError(null);
    try {
      const run = await runAgent(agentId, task.trim());
      onRunComplete(run);
      setTask("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-1">
        <Play size={15} className="text-accent-violet" />
        <h2 className="text-sm font-semibold text-white">Give this agent a task</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        The agent will reason through the task step by step, using its enabled tools as needed.
        This runs synchronously — the request stays open until the agent finishes.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="e.g. 'Check today's news for anything about our top competitor and summarize it.'"
          rows={3}
          required
          disabled={disabled || running}
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-accent-purple/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-purple/10 disabled:opacity-50 resize-none leading-relaxed"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <motion.div whileHover={{ scale: disabled || running ? 1 : 1.01 }} whileTap={{ scale: disabled || running ? 1 : 0.99 }}>
          <Button type="submit" disabled={disabled || running} className="w-full flex items-center justify-center gap-1.5">
            {running ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Running…
              </>
            ) : disabled ? (
              "Agent is busy…"
            ) : (
              <>
                <Play size={14} />
                Run task
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </GlassCard>
  );
}
