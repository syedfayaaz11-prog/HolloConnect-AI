"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Check,
  X,
  Crown,
  Zap,
  PartyPopper,
  Clock,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { GlassCard, Button } from "@/components/ui/primitives";
import { getMyBilling, upgradePlan, MyBilling } from "@/lib/billing";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const FEATURES: { label: string; free: boolean | string; pro: boolean | string; ultra: boolean | string }[] = [
  { label: "AI Chat", free: true, pro: true, ultra: true },
  { label: "AI Search & Deep Research", free: "Limited", pro: true, ultra: true },
  { label: "Image AI generations", free: "Limited", pro: "Standard", ultra: "Priority" },
  { label: "Video AI generations", free: false, pro: "Standard", ultra: "Priority" },
  { label: "Voice AI", free: "Limited", pro: true, ultra: true },
  { label: "Document AI", free: true, pro: true, ultra: true },
  { label: "Memory", free: true, pro: true, ultra: true },
  { label: "Projects", free: true, pro: true, ultra: true },
  { label: "AI Agents", free: false, pro: true, ultra: true },
  { label: "Automations", free: false, pro: true, ultra: true },
  { label: "Priority response speed", free: false, pro: false, ultra: true },
  { label: "Early access to new models", free: false, pro: false, ultra: true },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={15} className="text-green-400 mx-auto" />;
  if (value === false) return <X size={14} className="text-gray-600 mx-auto" />;
  return <span className="text-xs text-gray-300">{value}</span>;
}

export default function PricingPage() {
  const { user, checking } = useRequireAuth();
  const [billing, setBilling] = useState<MyBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<"PRO" | "ULTRA" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    getMyBilling()
      .then(setBilling)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [checking]);

  async function onUpgrade(plan: "PRO" | "ULTRA") {
    setUpgrading(plan);
    setError(null);
    try {
      const result = await upgradePlan(plan);
      setBilling((b) => (b ? { ...b, plan: result.plan, trialEndsAt: result.trialEndsAt, isTrialActive: false } : b));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUpgrading(null);
    }
  }

  if (checking) {
    return <PageLoadingScreen />;
  }

  const expiryLabel = billing?.trialEndsAt
    ? new Date(billing.trialEndsAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <AppShell user={user}>
      <div className="max-w-5xl mx-auto w-full px-6 py-10 min-h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-semibold text-white tracking-tight">Upgrade your workspace</h1>
          <p className="text-sm text-gray-400 mt-2 flex items-center justify-center gap-1.5">
            <Sparkles size={13} className="text-accent-violet" />
            Simple monthly pricing — cancel anytime
          </p>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-accent-violet" />
          </div>
        )}

        {error && <p className="text-sm text-red-400 text-center mb-4">{error}</p>}

        {!loading && billing && (
          <>
            {billing.isTrialActive && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-accent-gradient-soft p-5 mb-8"
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent-gradient rounded-full blur-3xl opacity-30" />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold flex items-center gap-2">
                      <PartyPopper size={16} className="text-accent-violet" />
                      New User Offer — 2 Months Free
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Every feature, Pro and Ultra both, at ₹0/month during your trial.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="flex items-center gap-1 text-[11px] text-gray-400 uppercase tracking-wide">
                        <Clock size={11} /> Days left
                      </p>
                      <p className="text-lg font-semibold text-white">{billing.daysRemaining}</p>
                    </div>
                    <div className="text-center">
                      <p className="flex items-center gap-1 text-[11px] text-gray-400 uppercase tracking-wide">
                        <CalendarDays size={11} /> Expires
                      </p>
                      <p className="text-sm font-medium text-white">{expiryLabel}</p>
                    </div>
                  </div>
                </div>
                <span className="inline-block mt-3 text-[11px] font-medium rounded-full bg-green-500/15 text-green-400 px-2.5 py-1">
                  Trial Active
                </span>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Pro */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                <GlassCard className="relative p-7 h-full flex flex-col border-accent-purple/30">
                  <span className="absolute -top-3 left-7 text-[11px] font-semibold rounded-full bg-accent-gradient text-white px-3 py-1 shadow-glow-sm">
                    Most Popular
                  </span>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={16} className="text-accent-violet" />
                    <h2 className="text-lg font-semibold text-white">HolloConnect AI Pro</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-5">For everyday power users</p>
                  <div className="flex items-end gap-1.5 mb-6">
                    <span className="text-4xl font-semibold text-white">₹{billing.displayProPriceInr}</span>
                    <span className="text-sm text-gray-500 mb-1">/month</span>
                    {billing.isTrialActive && (
                      <span className="text-xs text-gray-500 mb-1.5 ml-1 line-through">₹{billing.proPriceInr}</span>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {["Unlimited AI Chat", "Deep Research & AI Search", "Image & Video AI", "AI Agents & Automations"].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check size={14} className="text-accent-violet shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {billing.plan === "PRO" ? (
                    <Button variant="ghost" disabled className="w-full justify-center">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onUpgrade("PRO")}
                      disabled={upgrading !== null || billing.plan === "ULTRA"}
                      className="w-full justify-center"
                    >
                      {upgrading === "PRO" ? "Upgrading…" : billing.plan === "ULTRA" ? "Included in Ultra" : "Upgrade to Pro"}
                    </Button>
                  )}
                </GlassCard>
              </motion.div>

              {/* Ultra */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }}>
                <GlassCard className="relative p-7 h-full flex flex-col border-white/[0.14] shadow-[0_0_40px_-10px_rgba(139,92,246,0.35)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown size={16} className="text-amber-400" />
                    <h2 className="text-lg font-semibold text-white">HolloConnect AI Ultra</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-5">Maximum power, priority everything</p>
                  <div className="flex items-end gap-1.5 mb-6">
                    <span className="text-4xl font-semibold text-white">₹{billing.displayUltraPriceInr}</span>
                    <span className="text-sm text-gray-500 mb-1">/month</span>
                    {billing.isTrialActive && (
                      <span className="text-xs text-gray-500 mb-1.5 ml-1 line-through">₹{billing.ultraPriceInr}</span>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {["Everything in Pro", "Priority response speed", "Early access to new models", "Highest generation limits"].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check size={14} className="text-amber-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {billing.plan === "ULTRA" ? (
                    <Button variant="ghost" disabled className="w-full justify-center">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onUpgrade("ULTRA")}
                      disabled={upgrading !== null}
                      className="w-full justify-center"
                    >
                      {upgrading === "ULTRA" ? "Upgrading…" : "Upgrade to Ultra"}
                    </Button>
                  )}
                </GlassCard>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.22 }}
              className="mt-10 overflow-x-auto"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left text-xs text-gray-500 font-medium pb-3 pl-1">Feature</th>
                    <th className="text-center text-xs text-gray-500 font-medium pb-3 w-24">Free</th>
                    <th className="text-center text-xs text-gray-400 font-medium pb-3 w-24">Pro</th>
                    <th className="text-center text-xs text-gray-400 font-medium pb-3 w-24">Ultra</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((f) => (
                    <tr key={f.label} className="border-b border-white/[0.05]">
                      <td className="py-3 pl-1 text-gray-300">{f.label}</td>
                      <td className="py-3 text-center">
                        <FeatureCell value={f.free} />
                      </td>
                      <td className="py-3 text-center">
                        <FeatureCell value={f.pro} />
                      </td>
                      <td className="py-3 text-center">
                        <FeatureCell value={f.ultra} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </>
        )}
      </div>
    </AppShell>
  );
}
