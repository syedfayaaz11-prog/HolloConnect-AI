"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Plus } from "lucide-react";
import { Button, GlassCard, Input } from "@/components/ui/primitives";
import { Memory, MemoryType, createMemory } from "@/lib/memory";

const CREATABLE_TYPES: MemoryType[] = ["FACT", "PREFERENCE", "LONG_TERM"];

export function CreateMemoryForm({ onCreated }: { onCreated: (m: Memory) => void }) {
  const [type, setType] = useState<MemoryType>("FACT");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const memory = await createMemory({
        type,
        content: content.trim(),
        category: category.trim() || undefined,
        tags,
      });
      onCreated(memory);
      setContent("");
      setCategory("");
      setTagsInput("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <BrainCircuit size={15} className="text-accent-violet" />
        <h2 className="text-sm font-semibold text-white">Add a memory</h2>
      </div>

      <div className="flex gap-2 mb-3">
        {CREATABLE_TYPES.map((t) => (
          <motion.button
            key={t}
            type="button"
            onClick={() => setType(t)}
            whileTap={{ scale: 0.96 }}
            className={`text-xs rounded-lg px-3 py-1.5 border transition-colors duration-200 ${
              type === t
                ? "bg-accent-gradient text-white border-transparent shadow-glow-sm"
                : "bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-white/20"
            }`}
          >
            {t}
          </motion.button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Something to remember (e.g. 'Prefers concise answers')"
        />
        <div className="flex gap-2">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
          />
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags, comma-separated (optional)"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button type="submit" disabled={loading || !content.trim()} className="flex items-center gap-1.5">
          <Plus size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Saving…" : "Save memory"}
        </Button>
      </form>
    </GlassCard>
  );
}
