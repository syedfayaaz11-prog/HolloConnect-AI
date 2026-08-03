"use client";

import { CSSProperties, useMemo } from "react";
import { motion } from "framer-motion";
import { useMotionPreference } from "@/components/providers/MotionPreferenceProvider";

export type HolloLogoVariant = "static" | "watermark" | "floating" | "thinking" | "loading";

export interface HolloConnectLogoProps {
  /** Visual behavior — see module docs below for what each does. */
  variant?: HolloLogoVariant;
  /** Rendered size in px (square bounding box; the source asset is preserved-aspect within it). */
  size?: number;
  /** Overrides the variant's default resting opacity. */
  opacity?: number;
  /** Shows a soft blue/purple ambient glow behind the mark. Defaults to on for floating/thinking/loading. */
  glow?: boolean;
  className?: string;
  /** Accessible label. Pass "" for purely decorative uses (e.g. watermark) to hide from screen readers. */
  label?: string;
}

/**
 * HolloConnectLogo — the single source of truth for every brand-mark usage across the app.
 *
 * Variants:
 * - static:     Plain mark, no motion. Nav/sidebar, avatars, inline brand references.
 * - watermark:  Ultra-low-opacity background ambiance. No animation (kept cheap since many
 *               can be mounted across a page tree) — pointer-events-none, non-interactive.
 * - floating:   Gentle vertical bob + slow breathing scale, for hero/empty-state moments
 *               (login, register, chat welcome screen).
 * - thinking:   Compact "AI is working" indicator — continuous slow rotation, an independent
 *               breathing scale, glow intensity pulsing, and a staggered ring of ambient
 *               accent points (with their own subtle breathing) that suggest the mark's own
 *               petals activating in sequence. Replaces generic dot/spinner UI. Composed
 *               together with the aura/energy-wave/particle layers in
 *               components/chat/MessageBubble.tsx's ThinkingIndicator, which is the actual
 *               "AI thinking" moment shown in chat — this variant is its centerpiece.
 * - loading:    Same visual language as thinking, slightly larger by default — for standalone
 *               loading moments outside a chat bubble.
 *
 * All motion is transform/opacity only (GPU-friendly) and is disabled whenever the user
 * prefers reduced motion — either via the OS-level setting or the Settings page's "Reduce
 * motion" override (see MotionPreferenceProvider) — falling back to the plain static mark.
 */
export function HolloConnectLogo({
  variant = "static",
  size,
  opacity,
  glow,
  className = "",
  label = "HolloConnect AI",
}: HolloConnectLogoProps) {
  const reducedMotion = useMotionPreference();

  const resolvedSize = size ?? DEFAULT_SIZE[variant];
  const resolvedOpacity = opacity ?? DEFAULT_OPACITY[variant];
  const showGlow = glow ?? (variant === "floating" || variant === "thinking" || variant === "loading");
  const animated = !reducedMotion && variant !== "static" && variant !== "watermark";

  const src = useMemo(() => pickSrc(resolvedSize), [resolvedSize]);

  const wrapperStyle: CSSProperties = {
    width: resolvedSize,
    height: resolvedSize,
    opacity: variant === "watermark" ? resolvedOpacity : undefined,
  };

  // Watermark: intentionally the cheapest path — no motion component, no glow loop, just an
  // absolutely-positionable, non-interactive image. Callers control placement via className.
  if (variant === "watermark") {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={`select-none pointer-events-none ${className}`}
        style={wrapperStyle}
      />
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center pointer-events-none select-none ${className}`}
      style={{ width: resolvedSize, height: resolvedSize }}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      {showGlow && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-[-35%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(59,130,246,0.28) 45%, transparent 72%)",
            filter: "blur(10px)",
          }}
          animate={
            animated
              ? { opacity: [0.35, 0.75, 0.35], scale: [0.92, 1.05, 0.92] }
              : { opacity: 0.4, scale: 1 }
          }
          transition={
            animated
              ? { duration: variant === "floating" ? 5 : variant === "thinking" ? 3 : 2.4, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        />
      )}

      {(variant === "thinking" || variant === "loading") && animated && (
        <SequentialAccentRing size={resolvedSize} variant={variant} />
      )}

      <motion.img
        src={src}
        alt=""
        draggable={false}
        className="relative w-full h-full object-contain"
        initial={variant === "floating" ? { opacity: 0, y: 10, scale: 0.94 } : false}
        animate={
          animated
            ? variant === "floating"
              ? { opacity: resolvedOpacity, y: [0, -6, 0], scale: [1, 1.035, 1] }
              : variant === "thinking"
                ? { opacity: resolvedOpacity, scale: [1, 1.05, 1], rotate: 360 }
                : { opacity: resolvedOpacity, scale: [1, 1.06, 1], rotate: [-2, 2, -2] }
            : { opacity: resolvedOpacity }
        }
        transition={
          animated
            ? variant === "floating"
              ? { duration: 4.5, repeat: Infinity, ease: "easeInOut", opacity: { duration: 0.6 } }
              : variant === "thinking"
                ? {
                    // Very slow, continuous, one-directional turn — "a living AI core", not a
                    // spinner — decoupled from the independent breathing scale via per-key
                    // transition overrides so one doesn't force the other's timing.
                    opacity: { duration: 0.6 },
                    rotate: { duration: 9, repeat: Infinity, ease: "linear" },
                    scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                  }
                : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.4 }
        }
      />
    </div>
  );
}

/** A faint ring of accent points that fade in/out in sequence around the mark — an original,
 *  restrained nod to the logo's own 5-fold petal geometry activating, without needing to
 *  animate the raster asset's individual segments. */
function SequentialAccentRing({ size, variant }: { size: number; variant: "thinking" | "loading" }) {
  const points = 5;
  const radius = size * 0.62;
  const colors = ["#8b5cf6", "#3b82f6", "#22d3ee", "#a78bfa", "#6366f1"];

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {Array.from({ length: points }).map((_, i) => {
        const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * (radius / 2);
        const y = Math.sin(angle) * (radius / 2);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: size * 0.09,
              height: size * 0.09,
              left: "50%",
              top: "50%",
              marginLeft: -((size * 0.09) / 2),
              marginTop: -((size * 0.09) / 2),
              background: colors[i % colors.length],
              filter: "blur(2px)",
              transform: `translate(${x}px, ${y}px)`,
            }}
            animate={
              variant === "thinking"
                ? { opacity: [0.1, 0.9, 0.1], scale: [0.82, 1.18, 0.82] } // "each petal breathes"
                : { opacity: [0.1, 0.9, 0.1] } // loading: unchanged from before this redesign
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i / points) * 2,
            }}
          />
        );
      })}
    </div>
  );
}

const DEFAULT_SIZE: Record<HolloLogoVariant, number> = {
  static: 32,
  watermark: 520,
  floating: 88,
  thinking: 28,
  loading: 40,
};

const DEFAULT_OPACITY: Record<HolloLogoVariant, number> = {
  static: 1,
  watermark: 0.04,
  floating: 1,
  thinking: 1,
  loading: 1,
};

/** Picks the smallest pre-generated raster that still looks crisp at the target render size,
 *  keeping network payload down for the many small (nav/avatar) usages. */
function pickSrc(size: number): string {
  if (size <= 72) return "/branding/hollo-logo-64.png";
  if (size <= 160) return "/branding/hollo-logo-128.png";
  if (size <= 300) return "/branding/hollo-logo-256.png";
  return "/branding/hollo-logo.png";
}
