"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, Loader2, Circle } from "lucide-react";
import { Agent } from "@/lib/agents";

const STATUS_CONFIG: Record<Agent["status"], { label: string; className: string; icon: typeof Circle; spin?: boolean }> = {
  IDLE: { label: "Idle", className: "text-gray-400 bg-white/[0.06]", icon: Circle },
  RUNNING: { label: "Running…", className: "text-yellow-400 bg-yellow-400/10", icon: Loader2, spin: true },
};

export function AgentListItem({ agent }: { agent: Agent }) {
  const status = STATUS_CONFIG[agent.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/agents/${agent.id}`}
        className="glass rounded-xl2 p-4 flex items-center gap-3.5 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 group"
      >
        <div className="w-10 h-10 shrink-0 rounded-xl bg-accent-gradient-soft flex items-center justify-center group-hover:scale-105 transition-transform">
          <Bot size={17} className="text-accent-violet" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-200 truncate font-medium">{agent.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {agent.description || `${agent.tools.length} tool${agent.tools.length === 1 ? "" : "s"} · ${agent.model}`}
          </p>
        </div>

        <span
          className={`flex items-center gap-1.5 text-[11px] font-medium shrink-0 rounded-lg px-2.5 py-1 ${status.className}`}
        >
          <StatusIcon size={10} className={status.spin ? "animate-spin" : "fill-current"} />
          {status.label}
        </span>
      </Link>
    </motion.div>
  );
}
