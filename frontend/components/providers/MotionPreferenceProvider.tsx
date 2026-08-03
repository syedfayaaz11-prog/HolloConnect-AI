"use client";

import { createContext, useContext, useState } from "react";
import { useReducedMotion as useOsReducedMotion } from "framer-motion";

interface MotionPreferenceCtx {
  /** null = no saved override yet (or user is logged out) — defer to the OS setting. */
  override: boolean | null;
  setOverride: (value: boolean | null) => void;
}

const MotionPreferenceContext = createContext<MotionPreferenceCtx>({
  override: null,
  setOverride: () => {},
});

/**
 * Wraps the whole app (see app/layout.tsx) so the Settings page's "Reduce motion" toggle can
 * be read anywhere without prop-drilling. Starts with no override — AppShell hydrates it from
 * the authenticated user's saved `reducedMotion` setting once that's known (see its own
 * effect), so pre-login pages (auth split-screen) just fall back to the OS-level setting,
 * which is what they already did before this existed.
 */
export function MotionPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<boolean | null>(null);
  return (
    <MotionPreferenceContext.Provider value={{ override, setOverride }}>{children}</MotionPreferenceContext.Provider>
  );
}

/**
 * The value components should actually animate against: the user's saved override if one is
 * known, otherwise the OS-level `prefers-reduced-motion`. Used by HolloConnectLogo — the
 * brand mark reused across the sidebar, chat thinking indicator, auth screens, and loading
 * states — rather than every individual `motion.div` in the app; see PROJECT_PROGRESS.md for
 * the honest scope of what this setting currently affects.
 */
export function useMotionPreference(): boolean {
  const { override } = useContext(MotionPreferenceContext);
  const osReduced = useOsReducedMotion();
  return override ?? !!osReduced;
}

/** Used by AppShell to hydrate/update the override once the real user setting is known. */
export function useSetMotionPreference(): (value: boolean | null) => void {
  return useContext(MotionPreferenceContext).setOverride;
}
