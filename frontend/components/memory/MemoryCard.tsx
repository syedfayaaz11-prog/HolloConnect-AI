"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, Pencil, Trash2, Check, X, MessageSquare, Bot, Zap } from "lucide-react";
import { GlassCard, Button, Input } from "@/components/ui/primitives";
import { Memory, deleteMemory, setMemoryPinned, updateMemory } from "@/lib/memory";

const TYPE_STYLE: Record<Memory["type"], string> = {
  FACT: "text-blue-300 bg-blue-400/10",
  PREFERENCE: "text-purple-300 bg-purple-400/10",
  SUMMARY: "text-green-300 bg-green-400/10",
  SHORT_TERM: "text-yellow-300 bg-yellow-400/10",
  LONG_TERM: "text-pink-300 bg-pink-400/10",
};

const SOURCE_ICON: Record<string, typeof MessageSquare> = {
  chat: MessageSquare,
  agent: Bot,
  automation: Zap,
};

function sourceLabel(source: string | null): { label: string; Icon: typeof MessageSquare } | null {
  if (!source) return null;
  const [kind, id] = source.split(":");
  if (!id) return { label: source, Icon: MessageSquare };
  const labels: Record<string, string> = { chat: "Chat", agent: "Agent", automation: "Automation" };
  return { label: `${labels[kind] ?? kind} · ${id.slice(0, 8)}`, Icon: SOURCE_ICON[kind] ?? MessageSquare };
}

export function MemoryCard({
  memory,
  onUpdated,
  onDeleted,
}: {
  memory: Memory;
  onUpdated: (m: Memory) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(memory.content);
  const [tagsInput, setTagsInput] = useState(memory.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const updated = await updateMemory(memory.id, { content: content.trim(), tags });
      onUpdated(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function onTogglePin() {
    setPinning(true);
    try {
      const updated = await setMemoryPinned(memory.id, !memory.pinned);
      onUpdated(updated);
    } finally {
      setPinning(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await deleteMemory(memory.id);
      onDeleted(memory.id);
    } catch {
      setDeleting(false);
    }
  }

  const source = sourceLabel(memory.source);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard className={`p-4 ${memory.pinned ? "border border-accent-purple/30" : ""}`}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-medium rounded-md px-2 py-0.5 ${TYPE_STYLE[memory.type]}`}>
              {memory.type}
            </span>
            {memory.category && <span className="text-xs text-gray-500">· {memory.category}</span>}
            {source && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                · <source.Icon size={11} />
                {source.label}
              </span>
            )}
            {memory.pinned && (
              <span className="flex items-center gap-1 text-xs text-accent-violet">
                <Pin size={11} className="fill-current" />
                pinned
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 shrink-0">
            {new Date(memory.updatedAt).toLocaleDateString()}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              <Input value={content} onChange={(e) => setContent(e.target.value)} />
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Tags, comma-separated"
              />
              <div className="flex gap-2">
                <Button onClick={onSave} disabled={saving} className="flex items-center gap-1.5">
                  <Check size={13} />
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)} className="flex items-center gap-1.5">
                  <X size={13} />
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {memory.key && <p className="text-xs text-gray-500 mb-1">{memory.key}</p>}
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{memory.content}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {memory.tags.length > 0 && !editing && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {memory.tags.map((t) => (
              <span key={t} className="text-[10px] rounded-full bg-white/[0.06] border border-white/10 px-2 py-0.5 text-gray-400">
                #{t}
              </span>
            ))}
          </div>
        )}

        {!editing && (
          <div className="flex gap-4 mt-3.5">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
            <button
              onClick={onTogglePin}
              disabled={pinning}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <Pin size={12} className={memory.pinned ? "fill-current" : ""} />
              {memory.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
