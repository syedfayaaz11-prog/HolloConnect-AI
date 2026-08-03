import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface VoiceOption {
  id: string;
  label: string;
  provider: "openai" | "elevenlabs";
}

export interface VoiceSettings {
  defaultVoice: string;
  voiceProvider: string;
  availableVoices: VoiceOption[];
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");
  const res = await fetch(`${API_URL}/api/voice/transcribe`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const data = await handle(res);
  return data.text;
}

export async function speakText(text: string, voice?: string): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/voice/speak`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Speech synthesis failed");
  }
  return res.blob();
}

export async function getVoiceSettings(): Promise<VoiceSettings> {
  const res = await fetch(`${API_URL}/api/voice/settings`, { headers: authHeaders() });
  return handle(res);
}

export async function updateVoiceSettings(defaultVoice: string): Promise<VoiceSettings> {
  const res = await fetch(`${API_URL}/api/voice/settings`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ defaultVoice }),
  });
  return handle(res);
}
