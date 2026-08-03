"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by the root layout itself (app/layout.tsx) — app/error.tsx can't
 * catch those since it renders *inside* the layout. Must render its own <html>/<body> per
 * Next.js's contract for this file, since it replaces the entire root layout when it fires.
 * Kept deliberately minimal/dependency-free (no Tailwind/motion) since this is the very last
 * line of defense if something foundational breaks.
 */
export default function GlobalRootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a12",
          color: "#e5e5e5",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#999", marginBottom: 20 }}>
            HolloConnect AI hit an unexpected error loading the app shell.
          </p>
          <button
            onClick={reset}
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "8px 18px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
