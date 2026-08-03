"use client";

import { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { GlassCard, Input } from "@/components/ui/primitives";
import { Markdown } from "@/components/ui/Markdown";
import { askDocument } from "@/lib/documents";

export function AskDocumentPanel({ documentId }: { documentId: string }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setError(null);
    setLoading(true);
    const q = question.trim();
    setQuestion("");
    try {
      const answer = await askDocument(documentId, q);
      setHistory((prev) => [...prev, { question: q, answer }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <MessageCircleQuestion size={15} className="text-accent-violet" />
        <h2 className="text-sm font-semibold text-white">Ask this document</h2>
      </div>

      {history.length > 0 && (
        <div className="space-y-4 mb-4">
          <AnimatePresence initial={false}>
            {history.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-2"
              >
                <p className="text-sm text-gray-100 font-medium bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 inline-block">
                  {h.question}
                </p>
                <div className="rounded-xl bg-accent-gradient-soft border border-white/[0.06] px-3.5 py-3">
                  <Markdown>{h.answer}</Markdown>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Sparkles size={12} className="text-accent-violet animate-pulse" />
          Thinking…
        </div>
      )}

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this document…"
          disabled={loading}
        />
        <motion.button
          type="submit"
          disabled={loading || !question.trim()}
          whileHover={{ scale: loading || !question.trim() ? 1 : 1.03 }}
          whileTap={{ scale: loading || !question.trim() ? 1 : 0.97 }}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-accent-gradient disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 shadow-glow-sm transition-opacity"
        >
          <Send size={14} />
        </motion.button>
      </form>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </GlassCard>
  );
}
