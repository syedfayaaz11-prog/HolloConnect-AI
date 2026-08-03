/**
 * Voice AI provider abstraction. Speech-to-text and text-to-speech are handled as two
 * independent capabilities (a provider could support one, both, or neither) — same
 * swap-a-case pattern as ai.service.ts, websearch.service.ts, imagegen.service.ts.
 *
 * Default STT: OpenAI Whisper. Default TTS: OpenAI TTS. ElevenLabs is wired as a second
 * TTS option (generally higher quality voices) — set VOICE_PROVIDER=elevenlabs to use it.
 */

export interface VoiceOption {
  id: string;
  label: string;
  provider: "openai" | "elevenlabs";
}

// Static catalog — OpenAI's TTS voices are fixed names, ElevenLabs voice IDs are configured
// via env since they're account-specific (you pick/clone voices in their dashboard).
export const OPENAI_VOICES: VoiceOption[] = [
  { id: "alloy", label: "Alloy", provider: "openai" },
  { id: "echo", label: "Echo", provider: "openai" },
  { id: "fable", label: "Fable", provider: "openai" },
  { id: "onyx", label: "Onyx", provider: "openai" },
  { id: "nova", label: "Nova", provider: "openai" },
  { id: "shimmer", label: "Shimmer", provider: "openai" },
];

export function getElevenLabsVoices(): VoiceOption[] {
  const raw = process.env.ELEVENLABS_VOICE_IDS; // "id1:Label1,id2:Label2"
  if (!raw) return [];
  return raw.split(",").map((entry) => {
    const [id, label] = entry.split(":");
    return { id: id.trim(), label: (label ?? id).trim(), provider: "elevenlabs" as const };
  });
}

export function listAvailableVoices(): VoiceOption[] {
  return [...OPENAI_VOICES, ...getElevenLabsVoices()];
}

export async function transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Speech-to-text is not configured. Set OPENAI_API_KEY in backend/.env.");
  }

  const form = new FormData();
  // Buffer is typed generically over ArrayBufferLike (which includes SharedArrayBuffer),
  // but Blob's BlobPart type specifically wants a plain ArrayBuffer-backed view — a common
  // Node/DOM typing friction point. `new Uint8Array(buffer)` goes through the array-like
  // copy-constructor overload, producing a fresh ArrayBuffer-backed Uint8Array with
  // identical bytes (audio data is not corrupted or altered, just re-viewed).
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  form.append("model", "whisper-1");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Transcription failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.text as string;
}

export interface SpeechResult {
  buffer: Buffer;
  contentType: string;
}

export async function synthesizeSpeech(text: string, voiceId: string): Promise<SpeechResult> {
  const provider = OPENAI_VOICES.some((v) => v.id === voiceId) ? "openai" : "elevenlabs";

  if (provider === "openai") {
    return synthesizeOpenAI(text, voiceId);
  }
  return synthesizeElevenLabs(text, voiceId);
}

async function synthesizeOpenAI(text: string, voice: string): Promise<SpeechResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Text-to-speech is not configured. Set OPENAI_API_KEY in backend/.env.");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: "tts-1", voice, input: text }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Speech synthesis failed: ${response.status} ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType: "audio/mpeg" };
}

async function synthesizeElevenLabs(text: string, voiceId: string): Promise<SpeechResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ElevenLabs is not configured. Set ELEVENLABS_API_KEY in backend/.env.");
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`ElevenLabs synthesis failed: ${response.status} ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType: "audio/mpeg" };
}
