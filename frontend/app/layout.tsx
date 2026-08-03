import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MotionPreferenceProvider } from "@/components/providers/MotionPreferenceProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://holloconnect.in"),

  title: {
    default: "HolloConnect AI | Your All-in-One AI Workspace",
    template: "%s | HolloConnect AI",
  },

  description:
    "HolloConnect AI is an all-in-one AI workspace for chat, search, deep research, AI image generation, AI video generation, document AI, voice AI, coding, automation, AI agents, projects, and BYOK support for multiple AI models.",

  keywords: [
    "HolloConnect AI",
    "HolloConnect",
    "All in One AI",
    "All-in-One AI Platform",
    "AI Workspace",
    "AI Platform",
    "Unified AI Platform",
    "Multi AI Platform",
    "AI Super App",
    "AI Operating System",
    "Everything AI in One Place",
    "One AI for Everything",

    "BYOK",
    "BYOK AI",
    "Bring Your Own Key",
    "Bring Your Own API Key",
    "Personal API Keys",
    "Multiple API Keys",
    "OpenAI API Key",
    "Gemini API Key",
    "Claude API Key",
    "Grok API Key",
    "Anthropic API Key",

    "AI Assistant",
    "AI Chat",
    "AI Chatbot",
    "Conversational AI",
    "Personal AI Assistant",
    "AI Copilot",

    "ChatGPT",
    "ChatGPT Alternative",
    "Claude",
    "Claude AI",
    "Claude Alternative",
    "Gemini",
    "Google Gemini",
    "Gemini Alternative",
    "Perplexity",
    "Perplexity Alternative",
    "Grok",
    "Grok AI",
    "Grok Alternative",
    "Microsoft Copilot",
    "Copilot Alternative",

    "GPT-5",
    "OpenAI",
    "Anthropic",
    "Google AI",
    "Meta AI",
    "Llama",
    "Meta Llama",
    "Mistral AI",
    "DeepSeek",
    "Qwen AI",

    "Multiple AI Models",
    "All AI Models",
    "AI Model Comparison",
    "Switch AI Models",
    "Latest AI Models",
    "Best AI Models",

    "AI Search",
    "AI Web Search",
    "Deep Research",
    "Deep Research AI",
    "AI Research Assistant",

    "Image AI",
    "AI Image Generator",
    "Text to Image",
    "Image Generation",
    "AI Art Generator",
    "AI Photo Generator",

    "Video AI",
    "AI Video Generator",
    "Text to Video",
    "Image to Video",
    "Video Generation",

    "Voice AI",
    "AI Voice",
    "Speech to Text",
    "Text to Speech",
    "Voice Assistant",

    "Document AI",
    "PDF AI",
    "Document Chat",
    "OCR AI",
    "Document Analysis",

    "AI Coding Assistant",
    "Code Generator",
    "Programming AI",
    "Developer AI",
    "Software Development AI",

    "AI Agents",
    "Autonomous AI Agents",
    "AI Automation",
    "Workflow Automation",
    "Task Automation",

    "AI Projects",
    "AI Library",
    "AI Memory",
    "Knowledge Base",

    "Artificial Intelligence",
    "Generative AI",
    "Machine Learning",
    "Large Language Model",
    "LLM",
    "Productivity AI",
    "Enterprise AI",
    "Business AI",
    "AI for Students",
    "AI for Developers",
    "AI for Business",
    "Best AI Platform",
    "AI Tools",
    "AI Software",
    "AI Applications"
  ],

  authors: [
    {
      name: "Syed Fayaz",
    },
  ],

  creator: "Syed Fayaz",

  publisher: "HolloConnect AI",

  robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: "https://holloconnect.in",
  },

  openGraph: {
    title: "HolloConnect AI",
    description:
      "One AI workspace for chat, research, coding, image generation, video generation, automation, AI agents, BYOK support, and more.",
    url: "https://holloconnect.in",
    siteName: "HolloConnect AI",
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "HolloConnect AI",
    description:
      "One AI workspace for chat, research, coding, image generation, video generation, automation, AI agents, BYOK support, and more.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-hollo-gradient min-h-screen antialiased font-sans">
        <MotionPreferenceProvider>
          {children}
        </MotionPreferenceProvider>
      </body>
    </html>
  );
}