"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, SquarePen, Brain, Volume2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useVoicePlayback } from "@/hooks/useVoicePlayback";
import { runSearch } from "@/lib/search";
import { MessageBubble, ThinkingIndicator } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { WelcomeScreen } from "./WelcomeScreen";
import { useSidebar } from "@/components/layout/AppShell";
import { HolloConnectLogo } from "@/components/branding/HolloConnectLogo";
import { AuthUser } from "@/lib/auth";
import { ChatMessage } from "@/types";

// The permanent secondary chat-history column has been removed (redesign spec section 3) —
// recent/pinned conversations now live directly in the main AppShell sidebar, and full
// search/rename/pin/delete lives in the ChatSearchModal it opens. This component now only
// needs to talk to that sidebar via context (open search, report which chat is active,
// trigger a refresh after a new conversation is created).
export function ChatWindow({ initialChatId, user }: { initialChatId?: string; user?: AuthUser | null } = {}) {
  const [model, setModel] = useState("claude-sonnet-4");
  const [voiceMode, setVoiceMode] = useState(false);
  const { openChatSearch, refreshChats, setActiveChatId } = useSidebar();

  // Web search mode reuses the existing, fully-built AI Search feature (lib/search.ts's
  // runSearch -> POST /api/search) rather than the normal chat send path -- a genuine reuse
  // of existing functionality via a different orchestration, not a new backend capability.
  // Its turns are tracked separately since a search doesn't create/append to a Chat record.
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [searchMessages, setSearchMessages] = useState<ChatMessage[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const { chatId, messages, isStreaming, isLoadingHistory, sendMessage, stop, loadChat, startNewChat } =
    useChat(initialChatId);
  const { isSpeaking, speak, stop: stopSpeaking } = useVoicePlayback();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wasStreamingRef = useRef(false);
  const spokenIdsRef = useRef(new Set<string>());
  // "Near the bottom" is the whole ballgame for ChatGPT-style auto-scroll: if the user has
  // scrolled up to reread something, new tokens streaming in must never yank them back down.
  // Starts true so a freshly-opened chat still lands on the latest message.
  const isNearBottomRef = useRef(true);
  const NEAR_BOTTOM_THRESHOLD_PX = 120;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
  }, []);

  useEffect(() => {
    if (initialChatId) loadChat(initialChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatId]);

  // Keep the sidebar's highlighted item in sync with whichever conversation is actually
  // open here — covers loading an existing chat, starting a new one, and a brand-new chat
  // getting its id assigned after the first message is sent.
  useEffect(() => {
    setActiveChatId(chatId);
  }, [chatId, setActiveChatId]);

  const prevChatIdRef = useRef<string | undefined>(chatId);
  useEffect(() => {
    // A brand-new conversation just got its id (first message completed) — refresh the
    // sidebar's recent-chats list so it actually shows up without a full page reload.
    if (!prevChatIdRef.current && chatId) refreshChats();
    prevChatIdRef.current = chatId;
  }, [chatId, refreshChats]);

  const displayMessages = webSearchEnabled ? searchMessages : messages;
  const isBusy = webSearchEnabled ? searchLoading : isStreaming;

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    // Instant (not smooth) during streaming: with tokens arriving many times a second,
    // "smooth" scrolling queues up and visibly lags behind the actual text, which is what
    // produced the jumpy feeling this redesign is meant to eliminate. A plain jump keeps the
    // bottom pinned exactly, every update, with no animation queue to fall behind on.
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [displayMessages]);

  // A message the user just sent should always land them at the bottom, even if they'd
  // scrolled up earlier in the conversation — matches ChatGPT's behavior of resetting scroll
  // intent on send rather than requiring a manual scroll-down first.
  const handleSendScrollReset = useCallback(() => {
    isNearBottomRef.current = true;
  }, []);

  useEffect(() => {
    const justFinished = wasStreamingRef.current && !isStreaming;
    wasStreamingRef.current = isStreaming;
    if (!voiceMode || !justFinished || webSearchEnabled) return;

    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && last.content && !spokenIdsRef.current.has(last.id)) {
      spokenIdsRef.current.add(last.id);
      speak(last.content);
    }
  }, [isStreaming, messages, voiceMode, webSearchEnabled, speak]);

  const handleSend = useCallback(
    async (content: string) => {
      handleSendScrollReset();
      if (webSearchEnabled) {
        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
        setSearchMessages((prev) => [...prev, userMsg]);
        setSearchLoading(true);
        try {
          const result = await runSearch(content, model);
          const sourcesMd = result.sources.length
            ? "\n\n**Sources**\n" + result.sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join("\n")
            : "";
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.answer + sourcesMd,
          };
          setSearchMessages((prev) => [...prev, assistantMsg]);
        } catch (err) {
          setSearchMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: `Search failed: ${(err as Error).message}` },
          ]);
        } finally {
          setSearchLoading(false);
        }
        return;
      }
      sendMessage(content, model);
    },
    [handleSendScrollReset, webSearchEnabled, model, sendMessage]
  );

  const handleNewChat = useCallback(() => {
    startNewChat();
    setSearchMessages([]);
  }, [startNewChat]);

  const handleToggleWebSearch = useCallback(() => setWebSearchEnabled((w) => !w), []);

  return (
    <div className="flex flex-1 min-h-0 w-full">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={openChatSearch}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Search chats"
            >
              <Search size={16} />
            </button>
            <button
              onClick={handleNewChat}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="New chat"
            >
              <SquarePen size={16} />
            </button>
            <h2 className="text-white font-semibold text-sm ml-1.5">
              {webSearchEnabled ? "AI Search" : "New Chat"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/memory"
              title="Every message automatically draws on relevant saved memory -- view or manage it here"
              className="hidden sm:flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 glass glass-hover text-accent-violet transition-colors"
            >
              <Brain size={13} />
              Memory active
            </Link>
            <button
              onClick={() => {
                if (voiceMode) stopSpeaking();
                setVoiceMode((v) => !v);
              }}
              title="Toggle voice conversation mode -- assistant replies are read aloud"
              className={`text-xs rounded-lg px-3 py-2 transition-colors flex items-center gap-1.5 ${
                voiceMode ? "bg-accent-gradient text-white shadow-glow-sm" : "glass glass-hover text-gray-300"
              }`}
            >
              <Volume2 size={13} />
              {isSpeaking ? "Speaking…" : voiceMode ? "Voice on" : "Voice"}
            </button>
            <ModelSelector value={model} onChange={setModel} />
          </div>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {displayMessages.length === 0 && !isLoadingHistory ? (
            <WelcomeScreen onSelectPrompt={handleSend} user={user} />
          ) : (
            <div className="max-w-4xl mx-auto w-full px-6 py-5">
              {isLoadingHistory ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                      <div className="skeleton animate-shimmer h-16 w-2/3 rounded-xl2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {displayMessages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                  {isBusy && webSearchEnabled && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="flex gap-3 justify-start"
                    >
                      <div className="w-7 h-7 rounded-lg bg-accent-gradient shadow-glow-sm flex items-center justify-center shrink-0 mt-0.5">
                        <HolloConnectLogo variant="static" size={14} opacity={1} />
                      </div>
                      <div className="max-w-[80%] rounded-xl2 px-5 py-3 glass">
                        <ThinkingIndicator label="Searching the web" />
                      </div>
                    </motion.div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-1 flex justify-center">
          <div className="w-full max-w-[880px]">
            <ChatInput
              isStreaming={isBusy}
              onStop={stop}
              onSend={handleSend}
              webSearchEnabled={webSearchEnabled}
              onToggleWebSearch={handleToggleWebSearch}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
