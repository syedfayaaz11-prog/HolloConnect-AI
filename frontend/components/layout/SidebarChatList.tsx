"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, MessageSquare, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { DisplayChat } from "@/hooks/useChatList";

const MAX_VISIBLE = 6;

export function SidebarChatList({
  activeChatId,
  chats,
  loading,
  removeChat,
  renameChat,
  onNavigate,
  onSeeAll,
}: {
  activeChatId?: string;
  chats: DisplayChat[];
  loading: boolean;
  removeChat: (id: string) => Promise<void>;
  renameChat: (id: string, title: string) => Promise<void>;
  onNavigate?: () => void;
  onSeeAll: () => void;
}) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DisplayChat | null>(null);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the open menu on an outside click or Escape — standard dropdown behavior. Scoped to
  // only attach while a menu is actually open, not on every render.
  useEffect(() => {
    if (!openMenuId) return;
    function onDocMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenuId]);

  function startRename(chat: DisplayChat) {
    setOpenMenuId(null);
    setEditingId(chat.id);
    setEditValue(chat.displayTitle);
  }

  function cancelRename() {
    setEditingId(null);
    setEditValue("");
  }

  function saveRename(id: string) {
    const trimmed = editValue.trim();
    setEditingId(null);
    if (!trimmed) return;
    renameChat(id, trimmed).catch((err) => console.error("Rename failed:", err));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeChat(deleteTarget.id);
      // The deleted chat was the one currently open — land on a fresh blank chat rather than
      // leaving the user staring at a conversation that no longer exists.
      if (activeChatId === deleteTarget.id) {
        onNavigate?.();
        router.push("/chat");
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete chat:", err);
    } finally {
      setDeleting(false);
    }
  }

  const pinned = chats.filter((c) => c.displayPinned);
  const recent = chats.filter((c) => !c.displayPinned).slice(0, Math.max(0, MAX_VISIBLE - pinned.length));
  const visible = [...pinned, ...recent].slice(0, MAX_VISIBLE);

  if (loading) {
    return (
      <div className="space-y-1.5 px-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton animate-shimmer h-7 rounded-lg" />
        ))}
      </div>
    );
  }

  if (visible.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {visible.map((chat) => {
        const isActive = activeChatId === chat.id;
        const isMenuOpen = openMenuId === chat.id;
        const isEditing = editingId === chat.id;

        if (isEditing) {
          return (
            <div
              key={chat.id}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-white/[0.08]"
            >
              {chat.displayPinned ? (
                <Pin size={11} className="shrink-0 text-accent-violet" fill="currentColor" />
              ) : (
                <MessageSquare size={11} className="shrink-0 text-gray-600" />
              )}
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={() => saveRename(chat.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur(); // triggers saveRename via onBlur above
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
                maxLength={200}
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-white border-b border-accent-purple/50"
              />
            </div>
          );
        }

        return (
          <div key={chat.id} className="group relative">
            <button
              onClick={() => {
                onNavigate?.();
                router.push(`/chat?id=${chat.id}`);
              }}
              className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 pr-7 text-[13px] text-left transition-colors duration-150 ${
                isActive ? "bg-white/[0.08] text-white" : "text-gray-400 hover:bg-white/[0.045] hover:text-gray-200"
              }`}
            >
              {chat.displayPinned ? (
                <Pin size={11} className="shrink-0 text-accent-violet" fill="currentColor" />
              ) : (
                <MessageSquare size={11} className="shrink-0 text-gray-600" />
              )}
              <span className="flex-1 truncate">{chat.displayTitle}</span>
            </button>

            {/* Three-dot menu trigger — visible on row hover, or always while active/open, so
                it's still reachable on touch devices where hover never fires. */}
            <div
              ref={isMenuOpen ? menuRef : undefined}
              className={`absolute right-0.5 top-1/2 -translate-y-1/2 ${
                isActive || isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(isMenuOpen ? null : chat.id);
                }}
                title="Chat options"
                aria-label="Chat options"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                className={`p-1 rounded-md transition-colors ${
                  isMenuOpen ? "bg-white/[0.12] text-white" : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.08]"
                }`}
              >
                <MoreHorizontal size={13} />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    role="menu"
                    aria-label={`Options for ${chat.displayTitle}`}
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -2 }}
                    transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-1 z-20 w-36 rounded-xl border border-white/[0.09] bg-[#13131f]/95 backdrop-blur-2xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55)] py-1 overflow-hidden"
                  >
                    <button
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(chat);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-gray-300 hover:bg-white/[0.07] hover:text-white transition-colors"
                    >
                      <Pencil size={12} />
                      Rename
                    </button>
                    <button
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                        setDeleteTarget(chat);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      <button
        onClick={() => {
          onNavigate?.();
          onSeeAll();
        }}
        className="w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] text-gray-500 hover:text-gray-300 transition-colors"
      >
        See all conversations…
      </button>

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => !deleting && setDeleteTarget(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-chat-title"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm rounded-2xl border border-white/[0.09] bg-[#0d0d16]/95 backdrop-blur-2xl shadow-[0_24px_70px_-12px_rgba(0,0,0,0.6)] p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 size={16} className="text-red-400" />
                </div>
                <p id="delete-chat-title" className="text-sm font-semibold text-white">
                  Delete conversation?
                </p>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-5">
                "{deleteTarget.displayTitle}" will be permanently deleted. This can't be undone.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="rounded-lg px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-red-500/90 hover:bg-red-500 text-white transition-colors disabled:opacity-60"
                >
                  {deleting && <Loader2 size={12} className="animate-spin" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
