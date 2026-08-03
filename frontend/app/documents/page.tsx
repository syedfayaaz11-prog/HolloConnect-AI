"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles, ScanText, MessageCircleQuestion, Languages } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentListItem } from "@/components/documents/DocumentListItem";
import { Skeleton } from "@/components/ui/primitives";
import { DocumentSummaryItem, listDocuments } from "@/lib/documents";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

// What Document AI can actually do, per document, once uploaded — matched to the real
// `summarizeDocument` / `askDocument` / `translateDocument` endpoints in lib/documents.ts.
// Kept to real capabilities only; no "extract"/"compare" cards since there's no backend
// support for those yet.
const CAPABILITIES = [
  { label: "Summarize", desc: "Get a concise summary of any uploaded file", icon: ScanText },
  { label: "Ask Questions", desc: "Chat with a document to pull out specific answers", icon: MessageCircleQuestion },
  { label: "Translate", desc: "Translate extracted text into another language", icon: Languages },
];

export default function DocumentsPage() {
  const { user, checking } = useRequireAuth();
  const [docs, setDocs] = useState<DocumentSummaryItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    listDocuments()
      .then(setDocs)
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
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Document AI</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Sparkles size={11} className="text-accent-violet" />
              Upload, summarize, translate, and ask questions about your files
            </p>
          </div>
        </motion.div>

        <DocumentUploader onUploaded={(doc) => setDocs((prev) => [doc, ...prev])} />
        {error && <p className="text-sm text-red-400">{error}</p>}

        {docs.length === 0 && !initialLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CAPABILITIES.map((c) => (
              <div key={c.label} className="glass rounded-xl2 p-4">
                <div className="w-8 h-8 rounded-lg bg-accent-gradient-soft flex items-center justify-center mb-2.5">
                  <c.icon size={14} className="text-accent-violet" />
                </div>
                <p className="text-sm text-white font-medium">{c.label}</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">{c.desc}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {initialLoading &&
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[68px] rounded-xl2" />)}

          <AnimatePresence mode="popLayout">
            {docs.map((doc) => (
              <DocumentListItem key={doc.id} doc={doc} />
            ))}
          </AnimatePresence>

          {!initialLoading && docs.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6"
            >
              <p className="text-sm text-gray-400">No documents yet — upload one above to get started.</p>
            </motion.div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
