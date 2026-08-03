import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MotionPreferenceProvider } from "@/components/providers/MotionPreferenceProvider";

// next/font self-hosts the font at build time (no runtime request to Google), and exposes
// it as a CSS variable consumed by tailwind.config.ts's fontFamily.sans — this is the
// standard, recommended way to use Google Fonts in Next.js App Router.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "HolloConnect AI",
  description: "One AI workspace for chat, research, code, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-hollo-gradient min-h-screen antialiased font-sans">
        <MotionPreferenceProvider>{children}</MotionPreferenceProvider>
      </body>
    </html>
  );
}
