"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, getCachedUser, getSessionUser } from "@/lib/auth";

/** Redirects to /login if unauthenticated; returns the current user once resolved.

    Uses the module-level session cache in lib/auth.ts: the very first call this page load
    pays a real network round trip, and every subsequent mount (i.e. every navigation between
    AI modules, since each page calls this hook independently) resolves from memory
    immediately — `checking` starts `false` instead of blocking the page on a fresh
    /api/auth/me call every single time. A background revalidation still runs after an
    instant cached render, so a token that's actually been revoked is still caught. */
export function useRequireAuth() {
  const router = useRouter();
  const cached = getCachedUser();
  const [user, setUser] = useState<AuthUser | null>(cached ?? null);
  const [checking, setChecking] = useState(cached === undefined);

  useEffect(() => {
    let cancelled = false;
    getSessionUser().then((u) => {
      if (cancelled) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, checking };
}
