"use client";

import { useReducedMotion } from "framer-motion";

interface Particle {
  color: string;
  radius: number;
  size: number;
  duration: number;
  delay: number;
  direction: "normal" | "reverse";
  startAngle: number;
}

// Five brand-colored points at varied radii/speeds/directions so the orbit reads as organic
// ambient motion rather than a mechanical, single-speed ring.
const PARTICLES: Particle[] = [
  { color: "#3b82f6", radius: 58, size: 4, duration: 14, delay: 0, direction: "normal", startAngle: 20 },
  { color: "#22d3ee", radius: 70, size: 3, duration: 19, delay: -4, direction: "reverse", startAngle: 160 },
  { color: "#8b5cf6", radius: 50, size: 3.5, duration: 11, delay: -2, direction: "normal", startAngle: 250 },
  { color: "#d946ef", radius: 76, size: 3, duration: 22, delay: -9, direction: "reverse", startAngle: 310 },
  { color: "#a78bfa", radius: 62, size: 2.5, duration: 16, delay: -6, direction: "normal", startAngle: 100 },
];

/**
 * Renders a handful of extremely subtle orbiting lights around whatever this is placed inside
 * (expects an `absolute inset-0` position within a `relative` parent sized to the logo). Pure
 * CSS transform/opacity animation — no per-frame JS — so it stays cheap even though several
 * particles animate continuously. Respects prefers-reduced-motion by rendering nothing.
 */
export function AuthParticles() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <div key={i} className="absolute inset-0" style={{ transform: `rotate(${p.startAngle}deg)` }}>
          <div
            className="absolute inset-0 hollo-orbit"
            style={{
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationDirection: p.direction,
            }}
          >
            <span
              className="absolute rounded-full hollo-twinkle"
              style={{
                top: "50%",
                left: "50%",
                width: p.size,
                height: p.size,
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2 - p.radius,
                background: p.color,
                boxShadow: `0 0 6px 1px ${p.color}`,
                animationDuration: `${p.duration * 0.35}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes hollo-orbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes hollo-twinkle {
          0%,
          100% {
            opacity: 0.25;
          }
          50% {
            opacity: 0.85;
          }
        }
        .hollo-orbit {
          animation-name: hollo-orbit;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        .hollo-twinkle {
          animation-name: hollo-twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          will-change: opacity;
        }
      `}</style>
    </div>
  );
}
