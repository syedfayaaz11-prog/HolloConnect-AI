"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mic as MicIcon, Volume2, Sparkles, Square, Languages } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useVoicePlayback } from "@/hooks/useVoicePlayback";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeAudio } from "@/lib/voice";
import { VoiceOrb, VoiceOrbState } from "@/components/voice/VoiceOrb";
import { VoiceSettingsPanel } from "@/components/voice/VoiceSettingsPanel";
import { GlassCard, Button, Input } from "@/components/ui/primitives";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

// Real example phrases — clicking one actually calls the text-to-speech API with the
// currently selected voice, rather than a fake pre-recorded preview clip (none exist).
const USE_CASES = [
  { label: "Daily briefing", text: "Good morning. Here's a quick summary of what's on your plate today." },
  { label: "Reading assistant", text: "Let me read that document out loud for you while you multitask." },
  { label: "Meeting notes", text: "Here are the key action items from today's meeting." },
  { label: "Language practice", text: "Bonjour! Comment allez-vous aujourd'hui?" },
];

export default function VoicePage() {
  const { user, checking } = useRequireAuth();
  const [dictated, setDictated] = useState("");
  const [speakInput, setSpeakInput] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const { isSpeaking, error: speakError, speak, stop } = useVoicePlayback();
  const { isRecording, error: recordError, start, stop: stopRecording } = useAudioRecorder();

  async function onOrbClick() {
    if (isSpeaking) {
      stop();
      return;
    }
    if (isRecording) {
      const blob = await stopRecording();
      if (!blob) return;
      setTranscribing(true);
      setTranscribeError(null);
      try {
        const text = await transcribeAudio(blob);
        setDictated((prev) => (prev ? prev + " " : "") + text);
      } catch (err) {
        // Previously just console.error'd — the orb would stop spinning with zero feedback,
        // silently dropping the recording. The backend already sanitizes this message (see
        // friendlyProviderError), so it's always safe to show as-is.
        setTranscribeError((err as Error).message);
      } finally {
        setTranscribing(false);
      }
      return;
    }
    start();
  }

  const orbState: VoiceOrbState = isSpeaking
    ? "speaking"
    : transcribing
      ? "transcribing"
      : isRecording
        ? "listening"
        : "idle";

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AppShell user={user}>
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6 min-h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center">
            <MicIcon size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Voice AI</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Sparkles size={11} className="text-accent-violet" />
              Speech-to-text and text-to-speech
            </p>
          </div>
        </motion.div>

        {/* Central voice interaction area — one control for both dictation and interrupting
            playback, rather than a small icon buried in a form. */}
        <GlassCard className="flex flex-col items-center py-8">
          <VoiceOrb state={orbState} onClick={onOrbClick} />
          {(recordError || speakError || transcribeError) && (
            <p className="text-xs text-red-400 mt-4 text-center">{recordError || speakError || transcribeError}</p>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <MicIcon size={15} className="text-accent-violet" />
            <h2 className="text-sm font-semibold text-white">Transcript</h2>
          </div>
          <textarea
            value={dictated}
            onChange={(e) => setDictated(e.target.value)}
            placeholder="Your dictated text will appear here…"
            rows={4}
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all duration-200 focus:border-accent-purple/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-purple/10"
          />
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Volume2 size={15} className="text-accent-violet" />
            <h2 className="text-sm font-semibold text-white">Text-to-speech</h2>
          </div>
          <div className="flex gap-2">
            <Input
              value={speakInput}
              onChange={(e) => setSpeakInput(e.target.value)}
              placeholder="Type something to hear it spoken…"
            />
            {isSpeaking ? (
              <Button variant="ghost" onClick={stop} className="flex items-center gap-1.5 shrink-0">
                <Square size={13} fill="currentColor" />
                Stop
              </Button>
            ) : (
              <Button onClick={() => speak(speakInput)} disabled={!speakInput.trim()} className="shrink-0">
                Speak
              </Button>
            )}
          </div>
        </GlassCard>

        {/* Example use cases — real TTS calls with the phrase shown, not fabricated audio
            clips, so this only ever demonstrates what the feature actually does. */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Languages size={13} className="text-gray-500" />
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Try it out</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {USE_CASES.map((u) => (
              <button
                key={u.label}
                onClick={() => speak(u.text)}
                disabled={isSpeaking}
                className="text-left glass rounded-xl p-3 hover:border-white/[0.12] border border-transparent transition-colors disabled:opacity-50"
              >
                <p className="text-xs text-white font-medium mb-1">{u.label}</p>
                <p className="text-[11px] text-gray-500 line-clamp-2">{u.text}</p>
              </button>
            ))}
          </div>
        </div>

        <VoiceSettingsPanel onPreview={(voice) => speak("This is what I sound like.", voice)} />
      </div>
    </AppShell>
  );
}
