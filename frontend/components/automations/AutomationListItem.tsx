"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarClock, Clock, Webhook, CheckCircle2, PauseCircle, Circle } from "lucide-react";
import { Automation } from "@/lib/automations";

const TYPE_CONFIG: Record<Automation["type"], { label: string; icon: typeof CalendarClock }> = {
  SCHEDULED: { label: "Scheduled", icon: CalendarClock },
  ONE_TIME: { label: "One-time", icon: Clock },
  TRIGGER: { label: "Webhook trigger", icon: Webhook },
};

const STATUS_CONFIG: Record<Automation["status"], { className: string; icon: typeof Circle }> = {
  ACTIVE: { className: "text-green-400 bg-green-400/10", icon: CheckCircle2 },
  PAUSED: { className: "text-yellow-400 bg-yellow-400/10", icon: PauseCircle },
  COMPLETED: { className: "text-gray-400 bg-white/[0.06]", icon: Circle },
};

export function AutomationListItem({ automation }: { automation: Automation }) {
  const type = TYPE_CONFIG[automation.type];
  const status = STATUS_CONFIG[automation.status];
  const TypeIcon = type.icon;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/automations/${automation.id}`}
        className="glass rounded-xl2 p-4 flex items-center gap-3.5 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 group"
      >
        <div className="w-10 h-10 shrink-0 rounded-xl bg-accent-gradient-soft flex items-center justify-center group-hover:scale-105 transition-transform">
          <TypeIcon size={17} className="text-accent-violet" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-200 truncate font-medium">{automation.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {type.label}
            {automation.nextRunAt && ` · next: ${new Date(automation.nextRunAt).toLocaleString()}`}
          </p>
        </div>

        <span
          className={`flex items-center gap-1.5 text-[11px] font-medium shrink-0 rounded-lg px-2.5 py-1 ${status.className}`}
        >
          <StatusIcon size={11} />
          {automation.status.charAt(0) + automation.status.slice(1).toLowerCase()}
        </span>
      </Link>
    </motion.div>
  );
}
