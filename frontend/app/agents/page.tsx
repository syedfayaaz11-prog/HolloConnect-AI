"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, Search, FileSearch, PenTool, Workflow, Wand2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { CreateAgentForm, AgentTemplate } from "@/components/agents/CreateAgentForm";
import { AgentListItem } from "@/components/agents/AgentListItem";
import { Skeleton } from "@/components/ui/primitives";
import { Agent, listAgents } from "@/lib/agents";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

// Templates built from the agent tools the backend actually exposes (web_search,
// list_documents, document_qa, list_automations, run_automation, recall/save_memory) — no
// tool named here that agentTools.service.ts doesn't really register.
const AGENT_TEMPLATES: (AgentTemplate & { icon: typeof Bot })[] = [
  {
    name: "Research Agent",
    description: "Answers open questions using live web search",
    instructions:
      "You are a research assistant. Break the question into sub-questions, use web search to find current, credible sources, and synthesize a clear, well-cited answer.",
    tools: ["web_search", "save_memory"],
    icon: Search,
  },
  {
    name: "Document Analyst",
    description: "Answers questions grounded in uploaded documents",
    instructions:
      "You are a document analyst. Use the document tools to find and read relevant uploaded files before answering, and always ground your answer in what they actually say.",
    tools: ["list_documents", "document_qa"],
    icon: FileSearch,
  },
  {
    name: "Content Agent",
    description: "Drafts written content informed by web research",
    instructions:
      "You are a content writer. Research the topic with web search when useful, then draft clear, engaging copy in the tone requested. Keep claims accurate and cite sources when asked.",
    tools: ["web_search", "recall_memory"],
    icon: PenTool,
  },
  {
    name: "Automation Manager",
    description: "Reviews and runs existing automations on request",
    instructions:
      "You help manage this workspace's automations. List existing automations before acting, confirm what an automation does, and run it only when the request clearly matches it.",
    tools: ["list_automations", "run_automation"],
    icon: Workflow,
  },
  {
    name: "Custom Agent",
    description: "Start from a blank slate",
    instructions: "",
    tools: [],
    icon: Wand2,
  },
];

export default function AgentsPage() {
  const { user, checking } = useRequireAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<AgentTemplate | null>(null);

  useEffect(() => {
    if (checking) return;
    listAgents()
      .then(setAgents)
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
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">AI Agents</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Sparkles size={11} className="text-accent-violet" />
              Autonomous workers that reason step by step, using tools as needed
            </p>
          </div>
        </motion.div>

        <div>
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Start from a template</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {AGENT_TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => setTemplate({ ...t })}
                className="text-left glass rounded-xl p-3 hover:border-white/[0.12] border border-transparent transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-accent-gradient-soft flex items-center justify-center mb-2">
                  <t.icon size={13} className="text-accent-violet" />
                </div>
                <p className="text-xs text-white font-medium">{t.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        <CreateAgentForm onCreated={(a) => setAgents((prev) => [a, ...prev])} template={template} />
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-2">
          {initialLoading &&
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[68px] rounded-xl2" />)}

          <AnimatePresence mode="popLayout">
            {agents.map((a) => (
              <AgentListItem key={a.id} agent={a} />
            ))}
          </AnimatePresence>

          {!initialLoading && agents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6"
            >
              <p className="text-sm text-gray-400">No agents yet — pick a template above or build a custom one.</p>
            </motion.div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
