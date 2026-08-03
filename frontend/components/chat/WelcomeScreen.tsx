"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Code2, Lightbulb, PenLine, BarChart3, Search, Compass, MessageSquare } from "lucide-react";
import { HolloConnectLogo } from "@/components/branding/HolloConnectLogo";
import { useSidebar } from "@/components/layout/AppShell";
import { AuthUser } from "@/lib/auth";

// A larger pool than we ever show at once — four are picked at random per visit, so the
// welcome screen doesn't look like the same four static dashboard cards every time (spec
// section 4's "not four generic dashboard cards" note). Loosely grouped by time of day below.
const MORNING_PROMPTS = [
  { icon: Lightbulb, title: "Plan the day", prompt: "Help me prioritize my to-do list for today." },
  { icon: BarChart3, title: "Think it through", prompt: "What should I consider before choosing between two job offers?" },
];
const AFTERNOON_PROMPTS = [
  { icon: Code2, title: "Write some code", prompt: "Write a Python function that checks if a string is a palindrome." },
  { icon: Search, title: "Look something up", prompt: "What are the latest developments in renewable energy?" },
];
const EVENING_PROMPTS = [
  { icon: PenLine, title: "Draft something", prompt: "Draft a short, friendly email announcing a product launch." },
  { icon: Lightbulb, title: "Explain a concept", prompt: "Explain quantum computing like I'm a curious beginner." },
];
const ANYTIME_PROMPTS = [
  { icon: PenLine, title: "Brainstorm ideas", prompt: "Give me 5 creative names for a coffee subscription startup." },
  { icon: Code2, title: "Debug something", prompt: "Help me figure out why my React component keeps re-rendering." },
  { icon: BarChart3, title: "Compare options", prompt: "Compare the pros and cons of renting vs. buying a home." },
  { icon: Search, title: "Summarize a topic", prompt: "Summarize the main causes of the 2008 financial crisis." },
];

function greeting(hour: number): { text: string; prompts: typeof MORNING_PROMPTS } {
  if (hour < 5) return { text: "Still up?", prompts: EVENING_PROMPTS };
  if (hour < 12) return { text: "Good morning", prompts: MORNING_PROMPTS };
  if (hour < 17) return { text: "Good afternoon", prompts: AFTERNOON_PROMPTS };
  return { text: "Good evening", prompts: EVENING_PROMPTS };
}

function firstName(user: AuthUser | null | undefined): string | null {
  const source = user?.name?.trim();
  if (source) return source.split(" ")[0];
  return null;
}

function pickRandom<T>(pool: T[], count: number): T[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function WelcomeScreen({
  onSelectPrompt,
  user,
}: {
  onSelectPrompt: (prompt: string) => void;
  user?: AuthUser | null;
}) {
  const router = useRouter();
  const { chats, chatsLoading } = useSidebar();
  const recentChats = chats.slice(0, 3);

  // Randomized once per mount (not per render) so the picks don't shuffle mid-interaction.
  const { text: greetingText, suggestions } = useMemo(() => {
    const hour = new Date().getHours();
    const { text, prompts } = greeting(hour);
    const rest = pickRandom(ANYTIME_PROMPTS, 4 - prompts.length);
    return { text, suggestions: pickRandom([...prompts, ...rest], 4) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = firstName(user);

  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-8"
      >
        <HolloConnectLogo variant="floating" size={56} className="mx-auto mb-5" />
        <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
          {greetingText}{name ? `, ${name}` : ""}
        </h1>
        <p className="text-sm text-gray-400">What can I help with today?</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {suggestions.map((s, i) => (
          <motion.button
            key={s.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2 }}
            onClick={() => onSelectPrompt(s.prompt)}
            className="glass glass-hover rounded-xl2 p-4 text-left transition-shadow"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-gradient-soft flex items-center justify-center mb-3">
              <s.icon size={15} className="text-accent-violet" />
            </div>
            <p className="text-sm text-gray-200 font-medium mb-1">{s.title}</p>
            <p className="text-xs text-gray-500 line-clamp-2">{s.prompt}</p>
          </motion.button>
        ))}
      </div>

      {/* Real recent conversations — not a fifth generic suggestion card. Only shown once
          loaded and only if there's something real to continue. */}
      {!chatsLoading && recentChats.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="w-full max-w-xl mt-6"
        >
          <div className="flex items-center gap-1.5 mb-2 justify-center">
            <Compass size={11} className="text-gray-500" />
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Continue where you left off</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {recentChats.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/chat?id=${c.id}`)}
                className="flex items-center gap-1.5 text-xs rounded-full glass px-3.5 py-2 text-gray-300 hover:text-white hover:border-white/[0.15] border border-transparent transition-colors max-w-[220px]"
              >
                <MessageSquare size={11} className="text-gray-500 shrink-0" />
                <span className="truncate">{c.displayTitle}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
