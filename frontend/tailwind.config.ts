/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        base: "#05050a",
        surface: "#0a0a12",
        panel: "rgba(255,255,255,0.04)",
        border: "rgba(255,255,255,0.08)",
        accent: {
          purple: "#8b5cf6",
          violet: "#a78bfa",
          blue: "#3b82f6",
          cyan: "#22d3ee",
        },
      },
      backgroundImage: {
        "hollo-gradient":
          "radial-gradient(circle at 15% 10%, rgba(139,92,246,0.22), transparent 42%), radial-gradient(circle at 85% 0%, rgba(59,130,246,0.20), transparent 45%), radial-gradient(circle at 50% 100%, rgba(34,211,238,0.08), transparent 50%), #05050a",
        "hollo-mesh":
          "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.10) 50%, rgba(34,211,238,0.08))",
        "accent-gradient": "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
        "accent-gradient-soft": "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(59,130,246,0.12))",
      },
      boxShadow: {
        glow: "0 0 40px rgba(139,92,246,0.25)",
        "glow-sm": "0 0 20px rgba(139,92,246,0.18)",
        "glow-lg": "0 0 70px rgba(139,92,246,0.3)",
        card: "0 1px 0 rgba(255,255,255,0.05) inset, 0 8px 30px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "node-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.75" },
          "50%": { transform: "scale(1.35)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.8s linear infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "node-pulse": "node-pulse 3.2s ease-in-out infinite",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
