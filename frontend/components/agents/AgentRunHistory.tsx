"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, StopCircle } from "lucide-react";
import { AgentRun } from "@/lib/agents";

const STATUS_CONFIG: Record<
  AgentRun["status"],
  { className: string; icon: typeof CheckCircle2; spin?: boolean }
> = {
  RUNNING: { className: "text-yellow-400 bg-yellow-400/10", icon: Loader2, spin: true },
  SUCCESS: { className: "text-green-400 bg-green-400/10", icon: CheckCircle2 },
  FAILED: { className: "text-red-400 bg-red-400/10", icon: XCircle },
  STOPPED: { className: "text-gray-400 bg-white/[0.06]", icon: StopCircle },
};

export function AgentRunHistory({
  runs,
  onSelect,
  selectedId,
}: {
  runs: AgentRun[];
  onSelect: (run: AgentRun) => void;
  selectedId?: string;
}) {
  if (runs.length === 0) {
    return <p className="text-sm text-gray-500">No runs yet — give this agent a task above.</p>;
  }

  return (
    <div className="space-y-2">
      {runs.map((run, i) => {
        const status = STATUS_CONFIG[run.status];
        const StatusIcon = status.icon;
        const selected = selectedId === run.id;
        return (
          <motion.button
            key={run.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onSelect(run)}
            className={`w-full text-left glass rounded-xl2 p-4 transition-all duration-200 hover:bg-white/[0.07] ${
              selected ? "ring-1 ring-accent-purple/60 bg-white/[0.05]" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2 py-0.5 ${status.className}`}
              >
                <StatusIcon size={11} className={status.spin ? "animate-spin" : ""} />
                {run.status}
              </span>
              <span className="text-xs text-gray-500">{new Date(run.startedAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-300 truncate">{run.task}</p>
          </motion.button>
        );
      })}
    </div>
  );
}
