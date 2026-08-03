import type { CapacitorConfig } from "@capacitor/cli";

// IMPORTANT — update HOSTED_FRONTEND_URL to your real deployed frontend before building the
// APK. This is deliberately NOT the Next.js app bundled into the APK (see PROJECT_PROGRESS.md
// / the mobile-build notes for why: this project has dynamic routes with no
// generateStaticParams(), so `next export` fails — the same failure already hit before this
// config existed). Instead the APK is a thin native WebView shell that loads your real,
// publicly-hosted site, exactly like a normal mobile browser would. Every future frontend
// deploy is live immediately, with no APK rebuild needed.
//
// While iterating before holloconnect.in is live, point this at whatever your current public
// staging URL is (e.g. a Netlify preview URL) — it must be a real, publicly reachable HTTPS
// URL. It cannot be localhost, 127.0.0.1, or a local network IP: your testers' phones have no
// route to your machine's private network.
const HOSTED_FRONTEND_URL = "https://holloconnect.in";

const config: CapacitorConfig = {
  appId: "in.holloconnect.app",
  appName: "HolloConnect AI",
  // Only used as Capacitor's local-asset fallback (splash-style loading screen) — the real
  // content always comes from server.url below once the app has network connectivity.
  webDir: "capacitor-www",
  server: {
    url: HOSTED_FRONTEND_URL,
    androidScheme: "https",
    // Set true ONLY temporarily if you ever need to test against a plain http:// staging URL
    // (e.g. a raw IP during early debugging) — false is correct for any real deployment.
    cleartext: false,
  },
  android: {
    // Debug builds (what the CI workflow produces) are unaffected by this; it only matters
    // once you move to a signed release build.
    allowMixedContent: false,
  },
};

export default config;
