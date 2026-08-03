"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, Check } from "lucide-react";
import { GlassCard } from "@/components/ui/primitives";
import { VoiceSettings, getVoiceSettings, updateVoiceSettings } from "@/lib/voice";

export function VoiceSettingsPanel({
  onPreview,
}: {
  onPreview: (voice: string) => void;
}) {
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVoiceSettings().then(setSettings).catch((err) => setError(err.message));
  }, []);

  async function onSelect(voiceId: string) {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateVoiceSettings(voiceId);
      setSettings(updated);
      onPreview(voiceId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return error ? <p className="text-sm text-red-400">{error}</p> : null;
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Volume2 size={15} className="text-accent-violet" />
        <h2 className="text-sm font-semibold text-white">Voice</h2>
      </div>
      {settings.availableVoices.length === 0 ? (
        <p className="text-sm text-gray-500">No voices configured.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {settings.availableVoices.map((v) => {
            const active = settings.defaultVoice === v.id;
            return (
              <motion.button
                key={v.id}
                disabled={saving}
                onClick={() => onSelect(v.id)}
                whileHover={{ scale: saving ? 1 : 1.03 }}
                whileTap={{ scale: saving ? 1 : 0.97 }}
                className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${
                  active
                    ? "bg-accent-gradient text-white shadow-glow-sm"
                    : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]"
                }`}
              >
                {active && <Check size={12} />}
                {v.label}
              </motion.button>
            );
          })}
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </GlassCard>
  );
}
