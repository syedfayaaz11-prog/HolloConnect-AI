"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquarePlus, MessagesSquare, TrendingUp, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardSummary, fetchDashboardSummary } from "@/lib/dashboard";
import { StatCard } from "@/components/ui/StatCard";
import { GlassCard, Button, Skeleton } from "@/components/ui/primitives";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

export default function DashboardPage() {
  const { user, checking } = useRequireAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    fetchDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, [checking]);

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AppShell user={user}>
      <div className="max-w-5xl mx-auto w-full px-6 py-10 min-h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <p className="text-xs text-accent-violet font-medium mb-1.5 flex items-center gap-1.5">
              <Sparkles size={13} /> Workspace overview
            </p>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              Welcome back{user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="text-sm text-gray-400 mt-1">Here's what's happening in your workspace.</p>
          </div>
          <Link href="/chat">
            <Button className="flex items-center gap-2">
              <MessageSquarePlus size={16} />
              New chat
            </Button>
          </Link>
        </motion.div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {!summary && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[0, 1, 2].map((i) => (
              <GlassCard key={i} className="p-5">
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-7 w-14" />
              </GlassCard>
            ))}
          </div>
        )}

        {summary && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard label="Total chats" value={summary.totalChats} icon={MessagesSquare} />
              <StatCard label="Total messages" value={summary.totalMessages} icon={TrendingUp} />
              <StatCard label="Messages this week" value={summary.messagesThisWeek} icon={Sparkles} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard>
                <h2 className="text-sm font-semibold text-white mb-4">Recent chats</h2>
                {summary.recentChats.length === 0 ? (
                  <p className="text-sm text-gray-500">No chats yet — start one to see it here.</p>
                ) : (
                  <ul className="space-y-1">
                    {summary.recentChats.map((chat) => (
                      <li key={chat.id}>
                        <Link
                          href={`/chat?id=${chat.id}`}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-200 hover:bg-white/[0.05] transition-colors duration-200"
                        >
                          <span className="truncate">{chat.title}</span>
                          <span className="text-xs text-gray-500 ml-2 shrink-0">{chat.model}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>

              <GlassCard>
                <h2 className="text-sm font-semibold text-white mb-4">Model usage</h2>
                {summary.modelUsage.length === 0 ? (
                  <p className="text-sm text-gray-500">No usage data yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {summary.modelUsage.map((m) => (
                      <li key={m.model} className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-300">{m.model}</span>
                        <span className="text-gray-500">{m.count} chats</span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
