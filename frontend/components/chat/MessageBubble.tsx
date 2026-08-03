"use client";

import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, User } from "lucide-react";
import { Markdown } from "@/components/ui/Markdown";
import { HolloConnectLogo } from "@/components/branding/HolloConnectLogo";
import { useMotionPreference } from "@/components/providers/MotionPreferenceProvider";
import { ChatMessage } from "@/types";

// Deterministic per-particle configuration — fixed values rather than Math.random() so
// server-rendered and client-hydrated markup match exactly (Next.js would otherwise warn/
// mismatch on hydration if these were randomized at render time). The varied angle/radius/
// duration/direction per particle is what reads as "organic" rather than a random() call.
const THINKING_PARTICLES = [
  { angle: 15, radius: 21, size: 3, duration: 6.5, delay: 0, direction: 1 as const },
  { angle: 150, radius: 25, size: 2.5, duration: 8, delay: 0.9, direction: -1 as const },
  { angle: 255, radius: 19, size: 2.5, duration: 5.5, delay: 1.7, direction: 1 as const },
];

const THINKING_DOT_STATES = ["", ".", "..", "..."];

/** The layered "living AI core" behind the HolloConnectLogo mark in ThinkingIndicator: a
 *  breathing purple/cyan aura, energy-wave rings that radiate outward every ~2.5s, and a
 *  handful of small particles orbiting at different radii/speeds/directions that fade in and
 *  out as they travel. Entirely transform/opacity/blur — no layout-affecting properties — and
 *  fully inert (aria-hidden, pointer-events-none) since the logo underneath already carries
 *  the accessible label. Skipped entirely under reduced motion, same convention as
 *  HolloConnectLogo itself. */
function ThinkingCore({ reducedMotion }: { reducedMotion: boolean }) {
  const coreSize = 44;

  return (
    <div className="relative shrink-0" style={{ width: coreSize, height: coreSize }} aria-hidden="true">
      {!reducedMotion && (
        <>
          {/* Aura: soft purple/blue glow behind everything, gently expanding and contracting. */}
          <motion.div
            className="absolute inset-[-55%] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(34,211,238,0.2) 45%, transparent 75%)",
              filter: "blur(12px)",
            }}
            animate={{ scale: [0.88, 1.12, 0.88], opacity: [0.45, 0.8, 0.45] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Energy waves: rings radiating outward every ~2.5s, staggered so a new one begins
              before the last fully fades — a continuous pulse rather than a single blip. */}
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-[10%] rounded-full border border-accent-purple/50"
              animate={{ scale: [1, 2.15], opacity: [0.55, 0] }}
              transition={{
                duration: 2.3,
                repeat: Infinity,
                repeatDelay: 0.4,
                ease: "easeOut",
                delay: i * 1.35,
              }}
            />
          ))}

          {/* Orbiting particles: each rotates continuously around the core at its own radius/
              speed/direction (the rotation lives on the wrapper; the dot itself never
              rotates, since a circle rotating is indistinguishable from not) while separately
              fading in and out as it travels, so they don't feel like a mechanical ring. */}
          {THINKING_PARTICLES.map((p, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 flex items-center justify-center"
              style={{ transformOrigin: "50% 50%" }}
              animate={{ rotate: p.direction > 0 ? [p.angle, p.angle + 360] : [p.angle, p.angle - 360] }}
              transition={{ duration: p.duration, repeat: Infinity, ease: "linear" }}
            >
              <motion.span
                className="absolute rounded-full bg-accent-cyan"
                style={{ width: p.size, height: p.size, transform: `translateX(${p.radius}px)` }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1, 0.5] }}
                transition={{ duration: p.duration * 0.55, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
              />
            </motion.div>
          ))}
        </>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <HolloConnectLogo variant="thinking" size={26} label="" />
      </div>
    </div>
  );
}

/** Cycles "Thinking" → "Thinking." → "Thinking.." → "Thinking..." → repeat, crossfading
 *  between states. The word itself never moves — only the dots after it change — and the
 *  dots sit in a fixed-width slot so the label never shifts the layout around it as they
 *  animate. Frozen on "Thinking..." under reduced motion (still readable, no motion). */
function ThinkingLabel({ label, reducedMotion }: { label: string; reducedMotion: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => setStep((s) => (s + 1) % THINKING_DOT_STATES.length), 450);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const dots = reducedMotion ? "..." : THINKING_DOT_STATES[step];

  return (
    <span
      aria-hidden="true"
      className="inline-flex items-baseline text-xs text-gray-400 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer"
    >
      {label}
      <span className="inline-block w-[1.4em] text-left" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={dots}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="inline-block"
          >
            {dots}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

/**
 * The "AI is working" moment — shown in place of an assistant bubble's content until the
 * first token (or, for non-streaming flows like AI Search, the final answer) arrives. A
 * layered "living AI core" (breathing aura, radiating energy waves, orbiting particles, all
 * built around the existing HolloConnectLogo "thinking" variant — see ThinkingCore above)
 * paired with a continuously cycling "Thinking..." label, in place of a static caption or a
 * generic spinner.
 *
 * Everything here is the component's own initial/animate/exit motion — the actual cross-fade
 * against the arriving message content (mode="wait" AnimatePresence) lives one level up in
 * MessageBubbleImpl, untouched by this redesign. The exit here is intentionally soft (fade +
 * gentle scale-down, no snap) so streaming starting never reads as a sudden disappearance.
 */
export function ThinkingIndicator({ label = "Thinking" }: { label?: string }) {
  const reducedMotion = useMotionPreference();

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={`HolloConnect AI is ${label.toLowerCase()}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 py-0.5"
    >
      <ThinkingCore reducedMotion={reducedMotion} />
      <ThinkingLabel label={label} reducedMotion={reducedMotion} />
    </motion.div>
  );
}

function MessageBubbleImpl({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const reducedMotion = useMotionPreference();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-accent-gradient shadow-glow-sm flex items-center justify-center shrink-0 mt-0.5">
          <HolloConnectLogo variant="static" size={14} opacity={1} />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-xl2 px-5 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-accent-gradient text-white shadow-glow-sm"
            : message.error
              ? "bg-red-500/10 border border-red-500/25 text-red-300"
              : "glass text-gray-100"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {message.content ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {message.error ? (
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{message.content}</span>
                </div>
              ) : (
                <Markdown>{message.content}</Markdown>
              )}
            </motion.div>
          ) : (
            <ThinkingIndicator key="thinking" />
          )}
        </AnimatePresence>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
          <User size={13} className="text-gray-300" />
        </div>
      )}
    </motion.div>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
