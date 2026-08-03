"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/primitives";

export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}) {
  return (
    <GlassCard className="glass-hover p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-accent-gradient-soft flex items-center justify-center shrink-0">
            <Icon size={14} className="text-accent-violet" />
          </div>
        )}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="text-2xl font-semibold text-white tracking-tight"
      >
        {value}
      </motion.p>
    </GlassCard>
  );
}
