"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, fetchMe } from "@/lib/auth";

/** Redirects to /login if unauthenticated, or /dashboard if authenticated but not an admin. */
export function useRequireAdmin() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((u) => {
      if (cancelled) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      if (u.role !== "ADMIN") {
        router.replace("/dashboard");
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
