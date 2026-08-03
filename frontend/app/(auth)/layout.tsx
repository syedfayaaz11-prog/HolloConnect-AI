"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PageWatermark } from "@/components/branding/PageWatermark";
import { AuthCinematicPanel } from "@/components/auth/AuthCinematicPanel";

/**
 * Route-group layout shared by /login and /register. Next.js keeps this layout mounted across
 * navigation between the two sibling routes (only `children` swaps), so the visual panel and
 * ambient watermark stay put — no flash — while the form content itself crossfades in a short
 * slide, keyed by pathname so AnimatePresence can detect the route change.
 *
 * Desktop/tablet gets a true split screen: a cinematic AI-core visual on the left, the form on
 * the right, matching the "premium first impression" redesign requirement. Small screens drop
 * the visual panel entirely (rather than shrinking it) to keep the page light and the form the
 * clear focus on mobile.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <main className="min-h-screen flex bg-base relative overflow-hidden">
      <div className="hidden lg:block lg:w-[46%] xl:w-1/2 relative">
        <AuthCinematicPanel />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-hollo-mesh opacity-30 pointer-events-none lg:opacity-20" />
        <PageWatermark opacity={0.05} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: reducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducedMotion ? 0 : -16 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm py-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
