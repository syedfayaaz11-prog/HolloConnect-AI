"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

function ChatPageInner() {
  const { user, checking } = useRequireAuth();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id") ?? undefined;

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AppShell user={user} lockMainScroll>
      <ChatWindow initialChatId={idParam} user={user} />
    </AppShell>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<PageLoadingScreen />}>
      <ChatPageInner />
    </Suspense>
  );
}
