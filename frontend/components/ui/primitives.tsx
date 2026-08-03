"use client";

import { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react";
import { motion } from "framer-motion";

// GlassCard, Input, and Button keep the exact same export names and prop shapes used
// throughout the app (every page imports these three) — only the internal styling and
// micro-interactions changed. No call site needs to change.

export function GlassCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`glass rounded-xl2 shadow-card p-8 ${className}`}
      {...(props as any)}
    />
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-accent-purple/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-purple/10 ${className}`}
      {...props}
    />
  );
}

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base =
    "relative rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";
  const styles =
    variant === "primary"
      ? "bg-accent-gradient text-white shadow-glow-sm hover:shadow-glow"
      : "bg-white/[0.04] border border-white/10 text-gray-200 hover:bg-white/[0.08] hover:border-white/20";

  return (
    <motion.button
      whileHover={{ scale: props.disabled ? 1 : 1.02 }}
      whileTap={{ scale: props.disabled ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      className={`${base} ${styles} ${className}`}
      {...(props as any)}
    />
  );
}

/** A real, animated on/off switch — for settings that actually persist (see the Settings
    page), not a decorative toggle. Fully controlled; the caller owns the checked state and
    the save/error handling around onChange. */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full shrink-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-accent-gradient" : "bg-white/10"
      }`}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 16 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

/** Skeleton loading placeholder — drop in wherever content is still fetching, instead of
    a plain "Loading…" string, for a more premium perceived-performance feel. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton animate-shimmer rounded-lg ${className}`} />;
}
