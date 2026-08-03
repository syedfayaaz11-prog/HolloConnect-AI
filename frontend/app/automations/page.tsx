"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Workflow, Sparkles, Sunrise, Radar, FileBarChart, PenLine, Wand2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { CreateAutomationForm, AutomationTemplate } from "@/components/automations/CreateAutomationForm";
import { AutomationListItem } from "@/components/automations/AutomationListItem";
import { Skeleton } from "@/components/ui/primitives";
import { Automation, listAutomations } from "@/lib/automations";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const AUTOMATION_TEMPLATES: (AutomationTemplate & { label: string; icon: typeof Sunrise })[] = [
  {
    label: "Daily Briefing",
    name: "Daily Briefing",
    prompt:
      "Search the web for the top 5 news headlines relevant to the technology industry today and summarize each in 2 sentences.",
    type: "SCHEDULED",
    cronExpression: "0 8 * * *",
    icon: Sunrise,
  },
  {
    label: "Research Monitoring",
    name: "Research Monitoring",
    prompt:
      "Search the web for any new developments on [topic] since last week and summarize what's changed.",
    type: "SCHEDULED",
    cronExpression: "0 9 * * 1",
    icon: Radar,
  },
  {
    label: "Scheduled Report",
    name: "Weekly Report",
    prompt: "Compile a summary report of this week's key updates and format it as a short executive summary.",
    type: "SCHEDULED",
    cronExpression: "0 17 * * 5",
    icon: FileBarChart,
  },
  {
    label: "Content Workflow",
    name: "Content Draft",
    prompt: "Research [topic] and draft a short blog post outline with 3-5 key sections.",
    type: "ONE_TIME",
    icon: PenLine,
  },
  {
    label: "Custom",
    name: "",
    prompt: "",
    type: "SCHEDULED",
    icon: Wand2,
  },
];

export default function AutomationsPage() {
  const { user, checking } = useRequireAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<AutomationTemplate | null>(null);

  useEffect(() => {
    if (checking) return;
    listAutomations()
      .then(setAutomations)
      .catch((err) => setError(err.message))
      .finally(() => setInitialLoading(false));
  }, [checking]);

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AppShell user={user}>
      <div className="max-w-3xl mx-auto w-full px-6 py-8 space-y-6 min-h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center">
            <Workflow size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Automation</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Sparkles size={11} className="text-accent-violet" />
              AI tasks that run on a schedule, once at a set time, or via webhook
            </p>
          </div>
        </motion.div>

        <div>
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Start from a template</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {AUTOMATION_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => setTemplate({ ...t })}
                className="text-left glass rounded-xl p-3 hover:border-white/[0.12] border border-transparent transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-accent-gradient-soft flex items-center justify-center mb-2">
                  <t.icon size={13} className="text-accent-violet" />
                </div>
                <p className="text-xs text-white font-medium">{t.label}</p>
              </button>
            ))}
          </div>
        </div>

        <CreateAutomationForm
          onCreated={(a) => setAutomations((prev) => [a as Automation, ...prev])}
          template={template}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-2">
          {initialLoading &&
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[68px] rounded-xl2" />)}

          <AnimatePresence mode="popLayout">
            {automations.map((a) => (
              <AutomationListItem key={a.id} automation={a} />
            ))}
          </AnimatePresence>

          {!initialLoading && automations.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6"
            >
              <p className="text-sm text-gray-400">No automations yet — pick a template above or build your own.</p>
            </motion.div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
