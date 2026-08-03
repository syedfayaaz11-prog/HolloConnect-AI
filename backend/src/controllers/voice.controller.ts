import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { friendlyProviderError } from "../utils/friendlyError";
import { speakTextSchema, updateVoiceSettingsSchema } from "../utils/validation";
import { listAvailableVoices, synthesizeSpeech, transcribeAudio } from "../services/voice.service";

/**
 * STT and TTS are stateless pass-through operations (no DB persistence of audio) — they
 * exist to feed the Chat module's voice input/output, not as a standalone content gallery
 * like Image/Video AI. This keeps the request path fast and avoids storing potentially
 * sensitive spoken audio by default.
 */
export async function transcribe(req: AuthedRequest, res: Response) {
  const file = (req as unknown as { file?: Express.Multer.File }).file;
  if (!file) throw new ApiError(400, "No audio file uploaded");

  let text: string;
  try {
    text = await transcribeAudio(file.buffer, file.originalname || "audio.webm");
  } catch (err) {
    throw new ApiError(502, friendlyProviderError(err, "voice.controller:transcribe"));
  }

  res.json({ text });
}

export async function speak(req: AuthedRequest, res: Response) {
  const parsed = speakTextSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const userId = req.user!.userId;
  let voice = parsed.data.voice;
  if (!voice) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    voice = user?.defaultVoice ?? "alloy";
  }

  try {
    const result = await synthesizeSpeech(parsed.data.text, voice ?? "alloy");
    res.setHeader("Content-Type", result.contentType);
    res.send(result.buffer);
  } catch (err) {
    throw new ApiError(502, friendlyProviderError(err, "voice.controller:speak"));
  }
}

export async function getVoiceSettings(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { defaultVoice: true, voiceProvider: true },
  });
  if (!user) throw new ApiError(404, "User not found");

  res.json({ ...user, availableVoices: listAvailableVoices() });
}

export async function updateVoiceSettings(req: AuthedRequest, res: Response) {
  const parsed = updateVoiceSettingsSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const voices = listAvailableVoices();
  const chosen = voices.find((v) => v.id === parsed.data.defaultVoice);
  if (!chosen) throw new ApiError(400, "Unknown voice id");

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { defaultVoice: chosen.id, voiceProvider: chosen.provider },
    select: { defaultVoice: true, voiceProvider: true },
  });

  res.json({ ...user, availableVoices: voices });
}
