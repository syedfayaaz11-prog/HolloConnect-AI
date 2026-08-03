"use client";

import { FormEvent, memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Plus, Image as ImageIcon, FileText, Globe, Square } from "lucide-react";
import { MicButton } from "@/components/voice/MicButton";

const ATTACH_MENU_ITEMS = [
  {
    href: "/documents",
    label: "Upload a document",
    description: "Summarize, ask, translate via Document AI",
    icon: FileText,
    iconBg: "bg-accent-gradient-soft",
    iconColor: "text-accent-violet",
  },
  {
    href: "/images",
    label: "Generate an image",
    description: "Create visuals via Image AI",
    icon: ImageIcon,
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
  },
];

function ChatInputImpl({
  onSend,
  isStreaming,
  onStop,
  webSearchEnabled,
  onToggleWebSearch,
}: {
  onSend: (content: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
}) {
  const [value, setValue] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || isStreaming) return;
    onSend(value.trim());
    setValue("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e as unknown as FormEvent);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="glass rounded-2xl p-3.5 transition-colors duration-200 focus-within:border-white/20 focus-within:bg-white/[0.06]"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={webSearchEnabled ? "Search the web…" : "Message HolloConnect AI…"}
        className="w-full resize-none bg-transparent text-sm text-gray-100 placeholder:text-gray-500 outline-none max-h-[200px] leading-relaxed px-0.5"
      />

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <motion.button
              type="button"
              onClick={() => setAttachOpen((o) => !o)}
              whileTap={{ scale: 0.94 }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 ${
                attachOpen ? "text-white bg-white/[0.09]" : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
              }`}
              title="Attach"
            >
              <motion.span animate={{ rotate: attachOpen ? 45 : 0 }} transition={{ duration: 0.18 }}>
                <Plus size={16} />
              </motion.span>
            </motion.button>
            <AnimatePresence>
              {attachOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute bottom-full left-0 mb-2.5 w-64 rounded-2xl border border-white/[0.09] bg-[#0d0d16]/95 backdrop-blur-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.03)] p-2 z-20 origin-bottom-left"
                  onMouseLeave={() => setAttachOpen(false)}
                >
                  {ATTACH_MENU_ITEMS.map((item, i) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.03 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setAttachOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm text-gray-300 hover:bg-white/[0.07] hover:text-white transition-colors duration-150 group"
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg} group-hover:scale-105 transition-transform duration-150`}>
                          <item.icon size={15} className={item.iconColor} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium truncate">{item.label}</span>
                          <span className="block text-[11px] text-gray-500 truncate">{item.description}</span>
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={onToggleWebSearch}
            title="Search the web instead of asking the model directly"
            className={`h-8 flex items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors ${
              webSearchEnabled
                ? "bg-accent-gradient-soft text-accent-violet"
                : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <Globe size={14} />
            Web search
          </button>

          <MicButton disabled={isStreaming} onTranscribed={(text) => setValue((prev) => (prev ? prev + " " : "") + text)} />
        </div>

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            title="Stop generating"
          >
            <Square size={13} fill="currentColor" />
          </button>
        ) : (
          <motion.button
            type="submit"
            disabled={!value.trim()}
            whileHover={{ scale: value.trim() ? 1.05 : 1 }}
            whileTap={{ scale: value.trim() ? 0.95 : 1 }}
            className="w-9 h-9 rounded-xl bg-accent-gradient disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-glow-sm transition-opacity"
            title="Send"
          >
            <ArrowUp size={16} />
          </motion.button>
        )}
      </div>
    </form>
  );
}

export const ChatInput = memo(ChatInputImpl);
