"use client";

import { useEffect, useId, useRef, useState } from "react";
import { googleLogin } from "@/lib/auth";

// Google's own script — not an npm package, so this has zero install-time dependency (the
// registry blocks new package installs in this project's dev sandbox, documented elsewhere in
// PROJECT_PROGRESS.md; loading a script at runtime has no such restriction). Loaded once and
// reused by every mount of this component, not re-injected per page.
const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;
function loadGsiScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Sign-In")));
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Renders Google's own "Continue with Google" button and wires its result into our backend.
 * Silently renders nothing if NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't set — existing email/password
 * auth is the only path in that case, exactly as it was before this feature existed, rather
 * than showing a broken/non-functional button.
 */
export function GoogleSignInButton({
  onSuccess,
  onError,
}: {
  onSuccess: (user: Awaited<ReturnType<typeof googleLogin>>) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const instanceId = useId();

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const user = await googleLogin(response.credential);
              onSuccess(user);
            } catch (err) {
              onError((err as Error).message);
            }
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          width: 320,
          text: "continue_with",
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) onError("Couldn't load Google Sign-In. Check your connection and try again.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex items-center gap-3 w-full">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-wider text-gray-500">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      {/* Google renders its own button into this div — kept a fixed height so nothing shifts
          layout while the script loads. key={instanceId} avoids a stale ref across route
          transitions when this component remounts on a different page. */}
      <div ref={containerRef} key={instanceId} className="min-h-[44px] flex justify-center" aria-live="polite">
        {!ready && <div className="skeleton animate-shimmer h-[44px] w-full rounded-full" />}
      </div>
    </div>
  );
}
