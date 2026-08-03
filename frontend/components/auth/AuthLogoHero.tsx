"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HolloConnectLogo } from "@/components/branding/HolloConnectLogo";
import { AuthParticles } from "./AuthParticles";

interface AuthLogoHeroProps {
  size?: number;
  /** Briefly shows a brighter glow + an expanding energy ring — used right after a
   *  successful login/register, just before navigating to the dashboard. */
  success?: boolean;
}

/**
 * The branded hero above the Login/Signup form. Reuses the existing, unmodified
 * `HolloConnectLogo` (variant="floating") for the continuous float + breathing glow, and layers
 * auth-page-only decoration around it: a cinematic entrance (fade + scale), a few subtle
 * orbiting brand-colored particles, and an optional success-pulse burst.
 */
export function AuthLogoHero({ size = 72, success = false }: AuthLogoHeroProps) {
  const reducedMotion = useReducedMotion();
  const stageSize = size * 2.1;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex items-center justify-center shrink-0"
      style={{ width: stageSize, height: stageSize }}
    >
      {/* Entrance glow burst — fades/grows in on mount, brightens further on success. */}
      <motion.div
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          width: size * 1.7,
          height: size * 1.7,
          background:
            "radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(59,130,246,0.22) 45%, transparent 72%)",
          filter: "blur(14px)",
        }}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
        animate={{ opacity: success ? 0.95 : 0.55, scale: success && !reducedMotion ? 1.3 : 1 }}
        transition={{ duration: success ? 0.45 : 0.7, ease: "easeOut" }}
      />

      {success && !reducedMotion && (
        <motion.div
          aria-hidden="true"
          className="absolute rounded-full border border-accent-violet/50"
          style={{ width: size * 1.3, height: size * 1.3 }}
          initial={{ opacity: 0.6, scale: 0.4 }}
          animate={{ opacity: 0, scale: 2.4 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        />
      )}

      <AuthParticles />

      <motion.div
        animate={success && !reducedMotion ? { scale: 1.12 } : { scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <HolloConnectLogo variant="floating" size={size} />
      </motion.div>
    </motion.div>
  );
}
