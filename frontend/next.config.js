/** @type {import('next').NextConfig} */

// Read at build/start time — same variable the rest of the frontend already uses
// (lib/*.ts's `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"`) so the CSP
// always matches whichever backend this build is actually configured to talk to, rather
// than a hardcoded localhost that would silently break image/video loading (CSP violation)
// the moment this is deployed anywhere else.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  async headers() {
    return [
      {
        // Applies to every route this Next.js server renders.
        source: "/:path*",

        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), payment=()",
          },

          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              process.env.NODE_ENV === "development"
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: ${API_URL}`,
              `media-src 'self' blob: ${API_URL}`,
              `connect-src 'self' ${API_URL}`,
              "font-src 'self' data:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;