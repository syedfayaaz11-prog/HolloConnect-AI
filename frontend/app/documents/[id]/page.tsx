"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Languages,
  ScrollText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { GlassCard, Button, Input } from "@/components/ui/primitives";
import { Markdown } from "@/components/ui/Markdown";
import { AskDocumentPanel } from "@/components/documents/AskDocumentPanel";
import {
  DocumentRecord,
  getDocument,
  summarizeDocument,
  translateDocument,
} from "@/lib/documents";

const STATUS_STYLE: Record<DocumentRecord["status"], string> = {
  PROCESSING: "text-yellow-400 bg-yellow-400/10",
  READY: "text-green-400 bg-green-400/10",
  FAILED: "text-red-400 bg-red-400/10",
};

export default function DocumentDetailPage() {
  const { user, checking } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (checking) return;
    getDocument(params.id)
      .then(setDoc)
      .catch((err) => setError(err.message));
  }, [checking, params.id]);

  async function onSummarize() {
    if (!doc) return;
    setSummarizing(true);
    setError(null);
    try {
      const updated = await summarizeDocument(doc.id);
      setDoc(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSummarizing(false);
    }
  }

  async function onTranslate() {
    if (!doc) return;
    setTranslating(true);
    setError(null);
    try {
      const result = await translateDocument(doc.id, targetLanguage);
      setTranslated(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTranslating(false);
    }
  }

  if (checking || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 gap-2">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          Back to Document AI
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center shrink-0">
            <FileText size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-white tracking-tight truncate">{doc.filename}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400">{doc.mimeType}</p>
              <span className={`text-[11px] font-medium rounded-md px-1.5 py-0.5 ${STATUS_STYLE[doc.status]}`}>
                {doc.status === "PROCESSING" ? "Processing…" : doc.status.charAt(0) + doc.status.slice(1).toLowerCase()}
              </span>
            </div>
          </div>
        </motion.div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {doc.status === "PROCESSING" && (
          <GlassCard className="flex items-center gap-3">
            <Loader2 size={16} className="text-accent-violet animate-spin shrink-0" />
            <p className="text-sm text-gray-400">Extracting text from your file — this page will update automatically.</p>
          </GlassCard>
        )}

        {doc.status === "FAILED" && (
          <GlassCard className="flex items-center gap-3">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">Extraction failed: {doc.error}</p>
          </GlassCard>
        )}

        {doc.status === "READY" && (
          <>
            <GlassCard>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-accent-violet" />
                  <h2 className="text-sm font-semibold text-white">Summary</h2>
                </div>
                <Button variant="ghost" onClick={onSummarize} disabled={summarizing}>
                  {summarizing ? "Summarizing…" : doc.summary ? "Regenerate" : "Summarize"}
                </Button>
              </div>
              {doc.summary ? (
                <Markdown>{doc.summary}</Markdown>
              ) : (
                <p className="text-sm text-gray-500">No summary yet.</p>
              )}
            </GlassCard>

            <AskDocumentPanel documentId={doc.id} />

            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <Languages size={15} className="text-accent-violet" />
                <h2 className="text-sm font-semibold text-white">Translate</h2>
              </div>
              <div className="flex gap-2">
                <Input
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  placeholder="Target language"
                />
                <Button onClick={onTranslate} disabled={translating} className="shrink-0">
                  {translating ? "Translating…" : "Translate"}
                </Button>
              </div>
              {translated && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <Markdown>{translated}</Markdown>
                </div>
              )}
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <ScrollText size={15} className="text-accent-violet" />
                <h2 className="text-sm font-semibold text-white">Extracted text</h2>
              </div>
              <p className="text-xs text-gray-400 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                {doc.extractedText}
              </p>
            </GlassCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
