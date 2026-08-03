"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/primitives";
import { AutomationRun } from "@/lib/automations";

const STATUS_CONFIG: Record<
  AutomationRun["status"],
  { className: string; icon: typeof CheckCircle2; spin?: boolean }
> = {
  RUNNING: { className: "text-yellow-400 bg-yellow-400/10", icon: Loader2, spin: true },
  SUCCESS: { className: "text-green-400 bg-green-400/10", icon: CheckCircle2 },
  FAILED: { className: "text-red-400 bg-red-400/10", icon: XCircle },
};

export function AutomationRunHistory({ runs }: { runs: AutomationRun[] }) {
  if (runs.length === 0) {
    return <p className="text-sm text-gray-500">No runs yet.</p>;
  }

  return (
    <div className="space-y-3">
      {runs.map((run, i) => {
        const status = STATUS_CONFIG[run.status];
        const StatusIcon = status.icon;
        return (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span
                  className={`flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2 py-0.5 ${status.className}`}
                >
                  <StatusIcon size={11} className={status.spin ? "animate-spin" : ""} />
                  {run.status}
                </span>
                <span className="text-xs text-gray-500">{new Date(run.startedAt).toLocaleString()}</span>
              </div>
              {run.output && (
                <p className="text-xs text-gray-300 whitespace-pre-wrap line-clamp-6 leading-relaxed">
                  {run.output}
                </p>
              )}
              {run.error && <p className="text-xs text-red-400 leading-relaxed">{run.error}</p>}
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}
