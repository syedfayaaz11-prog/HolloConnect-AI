import { HolloConnectLogo } from "@/components/branding/HolloConnectLogo";

/** Full-page loading state shown while useRequireAuth() is verifying the session — briefly,
    on a cold page load, and near-instantly on client-side navigations now that lib/auth.ts
    caches the session user (see useRequireAuth.ts). Replaces what used to be 29 copies of
    the same bare, unstyled "Loading…" text with the same branded loading treatment already
    used for the chat "thinking" state, so a first-ever page load never reads as a blank or
    broken screen. */
export function PageLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <HolloConnectLogo variant="loading" />
    </div>
  );
}
