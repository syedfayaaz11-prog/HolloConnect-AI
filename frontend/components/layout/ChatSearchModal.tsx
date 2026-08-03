"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Pin, Pencil, Trash2, Check, X, MessageSquare, SquarePen } from "lucide-react";
import { groupChatsByDate, DisplayChat } from "@/hooks/useChatList";

export function ChatSearchModal({
  open,
  onClose,
  chats,
  loading,
  removeChat,
  togglePin,
  renameChat,
}: {
  open: boolean;
  onClose: () => void;
  chats: DisplayChat[];
  loading: boolean;
  removeChat: (id: string) => Promise<void>;
  togglePin: (id: string, current: boolean) => void;
  renameChat: (id: string, title: string) => Promise<void>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      // Focus after the entrance animation starts, not before the element exists.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(
    () => (query.trim() ? chats.filter((c) => c.displayTitle.toLowerCase().includes(query.toLowerCase())) : chats),
    [chats, query]
  );
  const groups = useMemo(() => groupChatsByDate(filtered), [filtered]);

  function openChat(id: string) {
    onClose();
    router.push(`/chat?id=${id}`);
  }

  function startNew() {
    onClose();
    router.push("/chat");
  }

  async function onDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await removeChat(id);
    } catch (err) {
      console.error(err);
    }
  }

  function startRename(chat: DisplayChat, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditValue(chat.displayTitle);
  }

  function saveRename(id: string) {
    setEditingId(null);
    renameChat(id, editValue).catch((err) => console.error("Rename failed:", err));
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[14vh] pb-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search conversations"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl rounded-2xl border border-white/[0.09] bg-[#0d0d16]/90 backdrop-blur-2xl shadow-[0_24px_70px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)] flex flex-col max-h-[70vh] overflow-hidden"
          >
            {/* Subtle top glow — same accent-gradient language as the rest of the app, just
                whisper-quiet here so it doesn't compete with the list. */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 bg-accent-gradient-soft blur-3xl opacity-60" />

            <div className="relative flex items-center gap-3 px-5 py-4 border-b border-white/[0.07]">
              <Search size={17} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="flex-1 bg-transparent outline-none text-[15px] text-gray-100 placeholder:text-gray-500"
              />
              <button
                onClick={startNew}
                title="New chat"
                className="flex items-center gap-1.5 text-xs font-medium text-gray-300 hover:text-white rounded-lg px-2.5 py-1.5 hover:bg-white/[0.08] transition-colors duration-150 shrink-0"
              >
                <SquarePen size={13} />
                New
              </button>
              <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-gray-500 border border-white/[0.12] bg-white/[0.03] rounded-md px-1.5 py-1 shrink-0 font-sans">
                Esc
              </kbd>
            </div>

            <div className="relative flex-1 overflow-y-auto px-3 py-3">
              {loading && (
                <div className="space-y-1.5 px-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton animate-shimmer h-10 rounded-xl" />
                  ))}
                </div>
              )}

              {!loading && groups.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className="flex flex-col items-center text-center px-6 py-16"
                >
                  <div className="w-12 h-12 rounded-2xl bg-accent-gradient-soft border border-white/[0.06] flex items-center justify-center mb-4">
                    <MessageSquare size={20} className="text-accent-violet" />
                  </div>
                  <p className="text-sm text-gray-300 font-medium mb-1">
                    {query ? "No matches" : "No conversations yet"}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-[240px]">
                    {query
                      ? `Nothing found for "${query}" — try a different search.`
                      : "Start a new chat and it'll show up here."}
                  </p>
                </motion.div>
              )}

              {groups.map((group) => (
                <div key={group.label} className="mb-4 last:mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold px-2.5 mb-1.5">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.chats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => editingId !== chat.id && openChat(chat.id)}
                        className="group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] cursor-pointer text-gray-300 hover:bg-white/[0.07] hover:text-white transition-colors duration-150"
                      >
                        <MessageSquare size={14} className="shrink-0 text-gray-500 group-hover:text-gray-400 transition-colors" />
                        {editingId === chat.id ? (
                          <div className="flex-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveRename(chat.id)}
                              className="flex-1 bg-transparent border-b border-accent-purple/50 outline-none text-sm"
                            />
                            <button onClick={() => saveRename(chat.id)} className="text-green-400 hover:text-green-300">
                              <Check size={13} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300">
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 truncate">{chat.displayTitle}</span>
                            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePin(chat.id, chat.displayPinned);
                                }}
                                className={`p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors ${chat.displayPinned ? "text-accent-violet" : "text-gray-500 hover:text-gray-300"}`}
                                title={chat.displayPinned ? "Unpin" : "Pin"}
                              >
                                <Pin size={12} fill={chat.displayPinned ? "currentColor" : "none"} />
                              </button>
                              <button
                                onClick={(e) => startRename(chat, e)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.08] transition-colors"
                                title="Rename"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={(e) => onDelete(chat.id, e)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
