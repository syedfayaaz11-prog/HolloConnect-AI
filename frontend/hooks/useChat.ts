"use client";

import { useCallback, useRef, useState } from "react";
import { getToken } from "@/lib/auth";
import { getChatDetail } from "@/lib/chatHistory";
import { ChatMessage } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useChat(initialChatId?: string) {
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Buffers tokens for the in-flight assistant message between animation frames, so a fast
  // stream (many small SSE events per second) produces at most one React state update — and
  // therefore one markdown/highlight reparse — per frame, instead of one per token.
  const pendingTokensRef = useRef("");
  const pendingAssistantIdRef = useRef<string | null>(null);
  const flushHandleRef = useRef<number | null>(null);

  const flushPendingTokens = useCallback(() => {
    flushHandleRef.current = null;
    const id = pendingAssistantIdRef.current;
    const chunk = pendingTokensRef.current;
    if (!id || !chunk) return;
    pendingTokensRef.current = "";
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: m.content + chunk } : m)));
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushHandleRef.current !== null) return;
    flushHandleRef.current = requestAnimationFrame(flushPendingTokens);
  }, [flushPendingTokens]);

  /** Cancels any pending animation-frame flush and immediately (synchronously) flushes
      whatever tokens are still buffered — called whenever the stream ends (success, error,
      or abort) so the last chunk of a fast-finishing stream is never silently dropped or
      left displayed one frame late. */
  const finalizeFlush = useCallback(() => {
    if (flushHandleRef.current !== null) {
      cancelAnimationFrame(flushHandleRef.current);
      flushHandleRef.current = null;
    }
    flushPendingTokens();
    pendingAssistantIdRef.current = null;
  }, [flushPendingTokens]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    finalizeFlush();
    setIsStreaming(false);
  }, [finalizeFlush]);

  /** Loads an existing conversation's full history — GET /api/chat/:id already existed on
      the backend, this just wires the frontend up to call it (previously unused). */
  const loadChat = useCallback(async (id: string) => {
    setIsLoadingHistory(true);
    try {
      const detail = await getChatDetail(id);
      setChatId(detail.id);
      setMessages(detail.messages);
    } catch (err) {
      console.error("Failed to load chat:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  /** Resets to a blank conversation — used by the "New chat" button. Purely local state;
      no request is made until the user actually sends a first message. */
  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    if (flushHandleRef.current !== null) {
      cancelAnimationFrame(flushHandleRef.current);
      flushHandleRef.current = null;
    }
    pendingTokensRef.current = "";
    pendingAssistantIdRef.current = null;
    setChatId(undefined);
    setMessages([]);
    setIsStreaming(false);
  }, []);

  /** Replaces whatever's in the in-flight assistant bubble with a visible error, instead of
      leaving it empty (stuck on the thinking animation forever) or only logging to console —
      this is the actual fix for "no infinite loading, no silent failures". Cancels any
      buffered tokens first so a partial reply can't get silently overwritten mid-flush. */
  const showStreamError = useCallback((assistantId: string | null, message: string) => {
    if (flushHandleRef.current !== null) {
      cancelAnimationFrame(flushHandleRef.current);
      flushHandleRef.current = null;
    }
    pendingTokensRef.current = "";
    if (!assistantId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId && !m.content ? { ...m, content: message, error: true } : m))
    );
  }, []);

  const sendMessage = useCallback(
    async (content: string, model: string) => {
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
      setIsStreaming(true);
      pendingAssistantIdRef.current = assistantId;
      pendingTokensRef.current = "";

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_URL}/api/chat/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ chatId, content, model }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let message = `Request failed (${res.status}).`;
          try {
            const body = await res.json();
            if (body?.error) message = body.error;
          } catch {
            // Non-JSON error body (e.g. a proxy/502 HTML page) — fall back to the generic message above.
          }
          showStreamError(assistantId, message);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamErrored = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const rawEvent of events) {
            const eventMatch = rawEvent.match(/^event: (.+)$/m);
            const dataMatch = rawEvent.match(/^data: (.+)$/m);
            const eventName = eventMatch?.[1];
            const data = dataMatch?.[1];
            if (!eventName || data === undefined) continue;

            if (eventName === "chat_id") {
              setChatId(data);
            } else if (eventName === "token") {
              const token = JSON.parse(data) as string;
              pendingTokensRef.current += token;
              scheduleFlush();
            } else if (eventName === "error") {
              streamErrored = true;
              let message = data;
              try {
                message = JSON.parse(data);
              } catch {
                // Backend sends error events as a plain string, not JSON — use as-is.
              }
              showStreamError(assistantId, message || "Something went wrong generating a response.");
            }
          }
        }

        // Belt-and-suspenders: if the stream ended without ever sending a token and without
        // an explicit error event either (e.g. the connection dropped silently), don't leave
        // the bubble stuck showing the thinking animation forever.
        if (!streamErrored && !pendingTokensRef.current) {
          setMessages((prev) => {
            const msg = prev.find((m) => m.id === assistantId);
            if (msg && !msg.content) {
              return prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: "No response was received. Please try again.", error: true }
                  : m
              );
            }
            return prev;
          });
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          showStreamError(assistantId, (err as Error).message || "Connection lost. Please try again.");
        }
      } finally {
        finalizeFlush();
        setIsStreaming(false);
      }
    },
    [chatId, finalizeFlush, scheduleFlush, showStreamError]
  );

  return {
    chatId,
    messages,
    setMessages,
    isStreaming,
    isLoadingHistory,
    sendMessage,
    stop,
    loadChat,
    startNewChat,
  };
}
