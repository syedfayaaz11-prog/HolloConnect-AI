/**
 * Video generation provider abstraction. Unlike image generation, video models are
 * near-universally async (jobs run for 30s-several minutes), so this module exposes a
 * start/poll pair rather than a single call. Default provider is Replicate, which hosts
 * most open text-to-video and image-to-video models behind one consistent predictions API —
 * swap REPLICATE_VIDEO_MODEL_VERSION to change the underlying model without code changes.
 * To add a genuinely different provider (e.g. Runway's own API), add a case here the same
 * way ai.service.ts branches on provider.
 */

import { friendlyProviderError } from "../utils/friendlyError";

export interface StartVideoJobResult {
  providerJobId: string;
}

export type VideoJobStatus = "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";

export interface VideoJobPollResult {
  status: VideoJobStatus;
  url?: string;
  error?: string;
}

function requireEnv() {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  const modelVersion = process.env.REPLICATE_VIDEO_MODEL_VERSION;
  if (!apiToken || !modelVersion) {
    throw new Error(
      "Video generation is not configured. Set REPLICATE_API_TOKEN and REPLICATE_VIDEO_MODEL_VERSION in backend/.env."
    );
  }
  return { apiToken, modelVersion };
}

export async function startVideoJob(
  prompt: string,
  sourceImageUrl?: string,
  sourceVideoUrl?: string
): Promise<StartVideoJobResult> {
  const { apiToken, modelVersion } = requireEnv();

  const input: Record<string, unknown> = { prompt };
  if (sourceImageUrl) input.image = sourceImageUrl;
  // "video" is the convention most Replicate video-to-video models (e.g. Kling, Runway-family
  // ports) expect for a reference clip. Like sourceImageUrl's "image" key above, this is
  // only meaningful if REPLICATE_VIDEO_MODEL_VERSION actually points at a model whose input
  // schema accepts it — a model that doesn't will reject the prediction with its own 4xx,
  // surfaced to the user the same way any other provider error is (see video.controller.ts).
  if (sourceVideoUrl) input.video = sourceVideoUrl;

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ version: modelVersion, input }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to start video generation: ${response.status} ${text}`);
  }

  const data = await response.json();
  return { providerJobId: data.id };
}

export async function pollVideoJob(providerJobId: string): Promise<VideoJobPollResult> {
  const { apiToken } = requireEnv();

  const response = await fetch(`https://api.replicate.com/v1/predictions/${providerJobId}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to check video job status: ${response.status} ${text}`);
  }

  const data = await response.json();

  if (data.status === "succeeded") {
    // Replicate returns either a single URL string or an array depending on the model.
    const url = Array.isArray(data.output) ? data.output[0] : data.output;
    return { status: "COMPLETE", url };
  }
  if (data.status === "failed" || data.status === "canceled") {
    return { status: "FAILED", error: friendlyProviderError(data.error ?? "Video generation failed", "videogen.service:poll") };
  }
  if (data.status === "processing") {
    return { status: "PROCESSING" };
  }
  return { status: "PENDING" };
}
