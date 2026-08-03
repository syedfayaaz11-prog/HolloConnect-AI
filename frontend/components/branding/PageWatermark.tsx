"use client";

import { HolloConnectLogo } from "./HolloConnectLogo";

/**
 * Drop this as the first child of any `relative` (or `relative overflow-hidden`) container to
 * add the subtle ambient brand watermark. It's absolutely positioned, non-interactive, and
 * clipped by the parent's `overflow-hidden` — so it never causes scroll or layout shift, and
 * never sits above interactive content (render it before other children so it stacks below).
 *
 * Centered, small, soft-blurred, low-opacity — meant to read as ambient texture the way
 * ChatGPT/Claude's background marks do, not as a visible logo. Same size/position on every
 * page since this one component is reused everywhere (Chat, Dashboard, Projects, Image/Video/
 * Document/Voice AI, Memory, Agents, Automations, Settings) — fixing it here fixes it
 * everywhere at once.
 */
export function PageWatermark({
  opacity = 0.06,
  className = "",
}: {
  /** 0.04–0.08 per the brand spec. */
  opacity?: number;
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <HolloConnectLogo
        variant="watermark"
        size={260}
        opacity={opacity}
        label=""
        className="blur-[2px] shrink-0"
      />
    </div>
  );
}
