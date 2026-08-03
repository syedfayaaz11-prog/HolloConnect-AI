"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Wrench, SlidersHorizontal, Plus } from "lucide-react";
import { GlassCard, Button, Input } from "@/components/ui/primitives";
import { Agent, AgentToolInfo, CreateAgentInput, createAgent, listAgentTools } from "@/lib/agents";

export interface AgentTemplate {
  name: string;
  description?: string;
  instructions: string;
  tools: string[];
}

export function CreateAgentForm({
  onCreated,
  template,
}: {
  onCreated: (a: Agent) => void;
  /** Set by a template card click on the page — repopulates the form each time a new
      (by-reference) template object comes in, even if it's the same template clicked twice. */
  template?: AgentTemplate | null;
}) {
  const [tools, setTools] = useState<AgentToolInfo[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [maxSteps, setMaxSteps] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAgentTools().then(setTools).catch(() => setTools([]));
  }, []);

  useEffect(() => {
    if (!template) return;
    setName(template.name);
    setDescription(template.description ?? "");
    setInstructions(template.instructions);
    setSelectedTools(template.tools);
  }, [template]);

  function toggleTool(name: string) {
    setSelectedTools((prev) => (prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !instructions.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const input: CreateAgentInput = {
        name: name.trim(),
        instructions: instructions.trim(),
        tools: selectedTools,
        maxSteps,
      };
      if (description.trim()) input.description = description.trim();

      const agent = await createAgent(input);
      onCreated(agent);
      setName("");
      setDescription("");
      setInstructions("");
      setSelectedTools([]);
      setMaxSteps(6);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-1">
        <Bot size={15} className="text-accent-violet" />
        <h2 className="text-sm font-semibold text-white">New agent</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        An agent is a reusable AI worker with a standing goal and a chosen set of tools. Give it a
        task later and it will reason step by step, using tools as needed, until it has an answer.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <Input placeholder="Agent name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          placeholder="Short description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Standing instructions / persona / goal — this is the agent's system prompt for every run, e.g. 'You are a research assistant for the sales team. Always cite sources and keep answers under 300 words.'"
          rows={3}
          required
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-accent-purple/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-purple/10 resize-none leading-relaxed"
        />

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Wrench size={12} className="text-gray-500" />
            <p className="text-xs text-gray-400">Tools this agent can use</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => {
              const active = selectedTools.includes(tool.name);
              return (
                <motion.button
                  key={tool.name}
                  type="button"
                  title={tool.description}
                  onClick={() => toggleTool(tool.name)}
                  whileTap={{ scale: 0.96 }}
                  className={`text-xs rounded-lg px-3 py-1.5 border transition-colors duration-200 ${
                    active
                      ? "bg-accent-gradient text-white border-transparent shadow-glow-sm"
                      : "bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-white/20"
                  }`}
                >
                  {tool.name}
                </motion.button>
              );
            })}
            {tools.length === 0 && <p className="text-xs text-gray-500">Loading tools…</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <SlidersHorizontal size={12} className="text-gray-500 shrink-0" />
          <label className="text-xs text-gray-400 shrink-0">Max steps per run</label>
          <input
            type="range"
            min={1}
            max={12}
            value={maxSteps}
            onChange={(e) => setMaxSteps(Number(e.target.value))}
            className="flex-1 accent-accent-purple"
          />
          <span className="text-xs text-gray-300 w-6 text-right font-medium">{maxSteps}</span>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-1.5">
          <Plus size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Creating…" : "Create agent"}
        </Button>
      </form>
    </GlassCard>
  );
}
