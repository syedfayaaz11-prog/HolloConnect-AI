"use client";

import { motion, useReducedMotion } from "framer-motion";

const NODES = [
  { angle: 0, radius: 150, size: 10, delay: 0 },
  { angle: 55, radius: 190, size: 7, delay: 0.4 },
  { angle: 120, radius: 130, size: 8, delay: 0.15 },
  { angle: 175, radius: 210, size: 6, delay: 0.6 },
  { angle: 230, radius: 160, size: 9, delay: 0.3 },
  { angle: 290, radius: 195, size: 7, delay: 0.5 },
  { angle: 335, radius: 140, size: 8, delay: 0.2 },
];

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

/**
 * Fills the visual half of the auth split-screen. Communicates "intelligent, living AI
 * system" through motion and light rather than a literal illustration — a slowly rotating
 * constellation of nodes around a glowing core, connected by thin light-lines, over an
 * ambient purple/cyan gradient mesh that matches the rest of the product's identity.
 */
export function AuthCinematicPanel() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative w-full h-full overflow-hidden bg-hollo-gradient">
      {/* Ambient mesh, same family as the rest of the app's backgrounds — no new visual
          language introduced, just a richer, larger canvas for it. */}
      <div className="absolute inset-0 bg-hollo-mesh opacity-60" />

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          style={{ width: 460, height: 460 }}
          animate={reducedMotion ? undefined : { rotate: 360 }}
          transition={reducedMotion ? undefined : { duration: 90, repeat: Infinity, ease: "linear" }}
        >
          {/* Connecting lines — a static SVG ring per node, cheap to render, no per-frame JS. */}
          <svg
            viewBox="-230 -230 460 460"
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            {NODES.map((n, i) => {
              const p = polar(n.angle, n.radius);
              return (
                <line
                  key={i}
                  x1={0}
                  y1={0}
                  x2={p.x}
                  y2={p.y}
                  stroke="url(#hollo-line-gradient)"
                  strokeWidth={1}
                  opacity={0.35}
                />
              );
            })}
            <defs>
              <linearGradient id="hollo-line-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>

          {/* Nodes — each breathes gently on its own cycle via a CSS animation delay so the
              whole thing reads as "alive" without JS driving every frame. */}
          {NODES.map((n, i) => {
            const p = polar(n.angle, n.radius);
            return (
              <div
                key={i}
                className={reducedMotion ? "absolute rounded-full" : "absolute rounded-full animate-node-pulse"}
                style={{
                  left: `calc(50% + ${p.x}px - ${n.size / 2}px)`,
                  top: `calc(50% + ${p.y}px - ${n.size / 2}px)`,
                  width: n.size,
                  height: n.size,
                  background: i % 2 === 0 ? "#a78bfa" : "#22d3ee",
                  boxShadow: `0 0 ${n.size * 2.5}px ${i % 2 === 0 ? "rgba(167,139,250,0.7)" : "rgba(34,211,238,0.7)"}`,
                  animationDelay: `${n.delay}s`,
                }}
              />
            );
          })}
        </motion.div>

        {/* Core glow — stays upright (not rotating with the ring above) so it reads as a
            stable center of gravity the nodes orbit around. */}
        <motion.div
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 140,
            height: 140,
            background: "radial-gradient(circle, rgba(139,92,246,0.55) 0%, rgba(59,130,246,0.25) 45%, transparent 75%)",
            filter: "blur(6px)",
          }}
          animate={reducedMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
          transition={reducedMotion ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Bottom gradient fade into the panel edge, plus the brand line. */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-base to-transparent" />
      <div className="absolute bottom-10 left-10 right-10">
        <p className="text-white text-2xl font-semibold tracking-tight leading-snug max-w-sm">
          One workspace. Every kind of intelligence.
        </p>
        <p className="text-gray-400 text-sm mt-2 max-w-sm">
          Chat, search, research, create, and automate — powered by HolloConnect AI.
        </p>
      </div>
    </div>
  );
}
