"use client";

import { useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeAudio } from "@/lib/voice";

export function MicButton({
  onTranscribed,
  disabled,
}: {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}) {
  const { isRecording, error: recordError, start, stop } = useAudioRecorder();
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  async function onClick() {
    if (isRecording) {
      const blob = await stop();
      if (!blob) return;
      setTranscribing(true);
      setTranscribeError(null);
      try {
        const text = await transcribeAudio(blob);
        onTranscribed(text);
      } catch (err) {
        setTranscribeError((err as Error).message);
      } finally {
        setTranscribing(false);
      }
    } else {
      start();
    }
  }

  const error = recordError || transcribeError;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || transcribing}
        title={isRecording ? "Stop recording" : "Record voice input"}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
          isRecording
            ? "bg-red-500/90 text-white animate-pulse-glow"
            : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
        }`}
      >
        {transcribing ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
