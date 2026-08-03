"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";
import { HolloConnectLogo } from "@/components/branding/HolloConnectLogo";

/**
 * Next.js App Router error boundary — automatically wraps every route under `app/` (any
 * uncaught render error bubbles up to the nearest one of these instead of leaving a blank
 * white screen with no way back). This didn't exist anywhere in the app before; it's a pure
 * addition, not a change to any existing page's behavior.
 *
 * `reset()` re-renders the segment that threw without a full page reload, so a transient
 * error (a flaky fetch, a race on first paint) can often be recovered from in place; "Go to
 * Dashboard" is the fallback for errors that keep recurring.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-hollo-gradient flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 max-w-sm w-full text-center">
        <HolloConnectLogo variant="static" size={40} className="mx-auto mb-4" opacity={0.85} />
        <h1 className="text-white font-semibold text-lg mb-1.5">Something went wrong</h1>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          An unexpected error interrupted this page. Your data is safe — try again, or head
          back to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm bg-accent-gradient text-white shadow-glow-sm hover:shadow-glow transition-shadow duration-200"
          >
            <RefreshCw size={14} />
            Try again
          </button>
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm glass glass-hover text-gray-300"
          >
            <Home size={14} />
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
