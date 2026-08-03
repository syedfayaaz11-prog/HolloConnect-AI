"use client";

import { motion } from "framer-motion";
import { Mic, Loader2, Volume2 } from "lucide-react";

export type VoiceOrbState = "idle" | "listening" | "transcribing" | "speaking";

const STATE_LABEL: Record<VoiceOrbState, string> = {
  idle: "Tap to speak",
  listening: "Listening…",
  transcribing: "Transcribing…",
  speaking: "Speaking…",
};

export function VoiceOrb({
  state,
  onClick,
  disabled,
}: {
  state: VoiceOrbState;
  onClick: () => void;
  disabled?: boolean;
}) {
  const active = state !== "idle";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-32 h-32 flex items-center justify-center">
        {active && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full bg-accent-gradient-soft"
              animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-2 rounded-full bg-accent-gradient-soft"
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.25 }}
            />
          </>
        )}
        <motion.button
          type="button"
          onClick={onClick}
          disabled={disabled}
          whileHover={{ scale: disabled ? 1 : 1.04 }}
          whileTap={{ scale: disabled ? 1 : 0.96 }}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-glow transition-colors duration-300 disabled:opacity-50 ${
            state === "listening" ? "bg-red-500" : "bg-accent-gradient"
          }`}
        >
          {state === "transcribing" ? (
            <Loader2 size={26} className="text-white animate-spin" />
          ) : state === "speaking" ? (
            <Volume2 size={26} className="text-white" />
          ) : (
            <Mic size={26} className="text-white" />
          )}
        </motion.button>
      </div>
      <p className="text-xs text-gray-400">{STATE_LABEL[state]}</p>
    </div>
  );
}
