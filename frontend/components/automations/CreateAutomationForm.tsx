"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Workflow, CalendarClock, Clock, Webhook, Plus } from "lucide-react";
import { Button, GlassCard, Input } from "@/components/ui/primitives";
import { AutomationType, CreateAutomationInput, createAutomation } from "@/lib/automations";

const TYPE_INFO: Record<AutomationType, string> = {
  SCHEDULED: "Runs repeatedly on a cron schedule (e.g. every morning at 9am).",
  ONE_TIME: "Runs once, at a specific date/time.",
  TRIGGER: "Runs whenever an external webhook URL is called.",
};

const TYPE_ICON: Record<AutomationType, typeof CalendarClock> = {
  SCHEDULED: CalendarClock,
  ONE_TIME: Clock,
  TRIGGER: Webhook,
};

export interface AutomationTemplate {
  name: string;
  prompt: string;
  type: AutomationType;
  cronExpression?: string;
}

export function CreateAutomationForm({
  onCreated,
  template,
}: {
  onCreated: (a: unknown) => void;
  template?: AutomationTemplate | null;
}) {
  const [type, setType] = useState<AutomationType>("SCHEDULED");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cronExpression, setCronExpression] = useState("0 9 * * *");
  const [runAt, setRunAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!template) return;
    setType(template.type);
    setName(template.name);
    setPrompt(template.prompt);
    if (template.cronExpression) setCronExpression(template.cronExpression);
  }, [template]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const input: CreateAutomationInput = { name: name.trim(), prompt: prompt.trim(), type };
      if (type === "SCHEDULED") input.cronExpression = cronExpression.trim();
      if (type === "ONE_TIME") input.runAt = new Date(runAt).toISOString();

      const automation = await createAutomation(input);
      onCreated(automation);
      setName("");
      setPrompt("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Workflow size={15} className="text-accent-violet" />
        <h2 className="text-sm font-semibold text-white">New automation</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {(["SCHEDULED", "ONE_TIME", "TRIGGER"] as AutomationType[]).map((t) => {
          const Icon = TYPE_ICON[t];
          const active = type === t;
          return (
            <motion.button
              key={t}
              type="button"
              onClick={() => setType(t)}
              whileTap={{ scale: 0.96 }}
              className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 border transition-colors duration-200 ${
                active
                  ? "bg-accent-gradient text-white border-transparent shadow-glow-sm"
                  : "bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-white/20"
              }`}
            >
              <Icon size={12} />
              {t === "SCHEDULED" ? "Scheduled" : t === "ONE_TIME" ? "One-time" : "Trigger (webhook)"}
            </motion.button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">{TYPE_INFO[type]}</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          placeholder="Automation name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What should the AI do when this runs? Be specific — this is the whole instruction, no one is there to clarify."
          rows={3}
          required
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-accent-purple/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-purple/10 resize-none leading-relaxed"
        />

        {type === "SCHEDULED" && (
          <div>
            <Input
              placeholder="Cron expression"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Standard 5-field cron (minute hour day month weekday). Example above runs daily at 9am.
            </p>
          </div>
        )}

        {type === "ONE_TIME" && (
          <Input
            type="datetime-local"
            value={runAt}
            onChange={(e) => setRunAt(e.target.value)}
            required
          />
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-1.5">
          <Plus size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Creating…" : "Create automation"}
        </Button>
      </form>
    </GlassCard>
  );
}
