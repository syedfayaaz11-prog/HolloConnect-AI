"use client";

import { motion } from "framer-motion";
import { Brain, Wrench, Eye, CheckCircle2, XCircle, StopCircle, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/primitives";
import { AgentRun } from "@/lib/agents";

const RESULT_CONFIG: Record<
  Exclude<AgentRun["status"], "RUNNING">,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  SUCCESS: { label: "Result", className: "border-green-400/30 text-green-400", icon: CheckCircle2 },
  FAILED: { label: "Error", className: "border-red-400/30 text-red-400", icon: XCircle },
  STOPPED: { label: "Stopped", className: "border-white/10 text-gray-400", icon: StopCircle },
};

export function AgentStepTrace({ run }: { run: AgentRun }) {
  const steps = run.steps ?? [];

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-accent-violet">
                <Brain size={12} />
                Step {step.index + 1}
              </span>
              {step.action && (
                <span className="flex items-center gap-1 text-[11px] rounded-lg bg-white/[0.06] border border-white/10 px-2 py-0.5 text-gray-300">
                  <Wrench size={10} />
                  {step.action === "final_answer" ? "Final answer" : step.action}
                </span>
              )}
            </div>

            {step.thought && (
              <p className="text-sm text-gray-300 mb-2.5 italic leading-relaxed">&ldquo;{step.thought}&rdquo;</p>
            )}

            {step.actionInput && Object.keys(step.actionInput).length > 0 && (
              <pre className="text-xs bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2 text-gray-400 overflow-x-auto mb-2.5">
                {JSON.stringify(step.actionInput, null, 2)}
              </pre>
            )}

            {step.observation && (
              <div>
                <p className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Eye size={11} />
                  Observation
                </p>
                <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{step.observation}</p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      ))}

      {run.status !== "RUNNING" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: steps.length * 0.03, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassCard className={`p-4 border ${RESULT_CONFIG[run.status].className}`}>
            <p className={`flex items-center gap-1.5 text-xs mb-1.5 ${RESULT_CONFIG[run.status].className}`}>
              {(() => {
                const Icon = RESULT_CONFIG[run.status].icon;
                return <Icon size={12} />;
              })()}
              {RESULT_CONFIG[run.status].label}
            </p>
            <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">{run.result ?? run.error}</p>
          </GlassCard>
        </motion.div>
      )}

      {steps.length === 0 && run.status === "RUNNING" && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={13} className="animate-spin text-accent-violet" />
          Working…
        </div>
      )}
    </div>
  );
}
