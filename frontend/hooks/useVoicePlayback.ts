"use client";

import { useCallback, useRef, useState } from "react";
import { speakText } from "@/lib/voice";

export function useVoicePlayback() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback((text: string, voice?: string, onEnd?: () => void) => {
    setError(null);
    setIsSpeaking(true);

    speakText(text, voice)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          onEnd?.();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setError("Playback failed");
        };
        audio.play();
      })
      .catch((err) => {
        setIsSpeaking(false);
        setError((err as Error).message);
      });
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, error, speak, stop };
}
