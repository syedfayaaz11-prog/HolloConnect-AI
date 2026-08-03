"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ChatSummary } from "@/types";
import { deleteChatHistory, listChatHistory, renameChatHistory } from "@/lib/chatHistory";

// AppShell (which owns the one useChatList() call — see the docstring below) currently has
// no shared layout to live in, so it fully remounts on every page navigation between AI
// modules. Without this cache, that meant a fresh /api/chat/history request — and a
// perceptibly empty sidebar until it resolved — every single time. This mirrors the same
// module-level cache + stale-while-revalidate pattern lib/auth.ts uses for the session user:
// first load pays the network cost, every remount after that paints instantly from memory
// while quietly refreshing in the background.
let cachedChats: ChatSummary[] | null = null;

export interface DisplayChat extends ChatSummary {
  displayTitle: string;
  displayPinned: boolean;
}

export interface ChatGroup {
  label: string;
  chats: DisplayChat[];
}

export function groupChatsByDate(chats: DisplayChat[]): ChatGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 86400000);

  const groups: ChatGroup[] = [
    { label: "Pinned", chats: [] },
    { label: "Today", chats: [] },
    { label: "Yesterday", chats: [] },
    { label: "Last 7 Days", chats: [] },
    { label: "Older", chats: [] },
  ];

  for (const chat of chats) {
    if (chat.displayPinned) {
      groups[0].chats.push(chat);
      continue;
    }
    const updated = new Date(chat.updatedAt);
    if (updated >= startOfToday) groups[1].chats.push(chat);
    else if (updated >= startOfYesterday) groups[2].chats.push(chat);
    else if (updated >= sevenDaysAgo) groups[3].chats.push(chat);
    else groups[4].chats.push(chat);
  }

  return groups.filter((g) => g.chats.length > 0);
}

/**
 * Loads the user's chat history once and exposes it, plus search filtering, delete, and
 * session-local pin/rename overrides (the backend has no rename/pin endpoint for Chat — see
 * the note in the original ConversationSidebar — so these stay client-only and reset on
 * reload, same documented limitation as before, just now shared instead of duplicated).
 *
 * Called exactly once, in AppShell, and shared via SidebarContext to the sidebar chat list,
 * the search modal, and the chat welcome screen — previously each of those three called this
 * independently, meaning up to three identical requests fired on a single page load.
 *
 * `refreshKey` lets a caller (e.g. "New Chat" being pressed) force a re-fetch.
 */
export function useChatList(refreshKey: number = 0) {
  const [chats, setChats] = useState<ChatSummary[]>(cachedChats ?? []);
  const [loading, setLoading] = useState(cachedChats === null);
  const [renamedTitles, setRenamedTitles] = useState<Record<string, string>>({});
  const [pinnedOverrides, setPinnedOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    // Only show the loading state on a genuinely cold start — if we already have a cached
    // list, this revalidation happens quietly behind whatever's already on screen.
    if (cachedChats === null) setLoading(true);
    listChatHistory()
      .then((data) => {
        if (cancelled) return;
        cachedChats = data;
        setChats(data);
      })
      .catch((err) => console.error("Failed to load chat history:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const removeChat = useCallback(async (id: string) => {
    await deleteChatHistory(id);
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      cachedChats = next;
      return next;
    });
  }, []);

  const togglePin = useCallback((id: string, current: boolean) => {
    setPinnedOverrides((prev) => ({ ...prev, [id]: !current }));
  }, []);

  const renameChat = useCallback(async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    // Optimistic: update instantly so the UI never waits on the network for something this
    // small, then reconcile (or roll back) once the request actually resolves.
    setRenamedTitles((prev) => ({ ...prev, [id]: trimmed }));
    try {
      await renameChatHistory(id, trimmed);
      // Now durable server-side — fold it into the real title and drop the override so this
      // chat behaves identically to one whose title was never touched (e.g. still reflects
      // correctly if `chats` is later re-fetched from a fresh refreshKey).
      setChats((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c));
        cachedChats = next;
        return next;
      });
      setRenamedTitles((prev) => {
        const { [id]: _dropped, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      console.error("Failed to rename chat:", err);
      setRenamedTitles((prev) => {
        const { [id]: _dropped, ...rest } = prev;
        return rest;
      });
      throw err; // lets the calling UI (sidebar/search modal) surface an error if it wants to
    }
  }, []);

  const displayChats: DisplayChat[] = useMemo(
    () =>
      chats
        .map((c) => ({
          ...c,
          displayTitle: renamedTitles[c.id] ?? c.title,
          displayPinned: pinnedOverrides[c.id] ?? c.pinned,
        }))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [chats, renamedTitles, pinnedOverrides]
  );

  return { chats: displayChats, loading, removeChat, togglePin, renameChat };
}
