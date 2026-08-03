import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { friendlyProviderError } from "../utils/friendlyError";
import { generateVideoSchema } from "../utils/validation";
import { pollVideoJob, startVideoJob } from "../services/videogen.service";
import { saveBuffer } from "../services/storage.service";
import { signLocalUploadUrl } from "../utils/signedFileUrl";
import { matchesFileSignature } from "../utils/fileSignature";

/**
 * Resolves a possibly-relative /uploads path to an absolute URL that an external provider
 * (Replicate) can actually fetch. Requires PUBLIC_BACKEND_URL to be set once the backend is
 * deployed somewhere reachable — localhost URLs can't be fetched by an external API, so we
 * fail with a clear message rather than silently sending a broken URL.
 */
function toPublicUrl(url: string): string {
  // Signed first — Replicate needs to actually fetch this over the internet, and the
  // uploads route requires a valid signature the same as a browser request would.
  const signed = signLocalUploadUrl(url) ?? url;
  if (signed.startsWith("http")) return signed;
  const base = process.env.PUBLIC_BACKEND_URL;
  if (!base) {
    throw new Error(
      "Image-to-video requires PUBLIC_BACKEND_URL to be set in backend/.env (a publicly " +
        "reachable URL for this server) so the video provider can fetch the source image."
    );
  }
  return `${base.replace(/\/$/, "")}${signed}`;
}

// sourceImageUrl/sourceVideoUrl and url are all local /uploads paths while a video is still
// processing (url becomes the provider's own external CDN link once complete, which
// signLocalUploadUrl passes through unchanged since it only touches /uploads/... paths).
function withSignedUrls<T extends { sourceImageUrl: string | null; sourceVideoUrl: string | null; url: string | null }>(
  video: T
): T {
  return {
    ...video,
    sourceImageUrl: signLocalUploadUrl(video.sourceImageUrl),
    sourceVideoUrl: signLocalUploadUrl(video.sourceVideoUrl),
    url: signLocalUploadUrl(video.url),
  };
}

export async function createVideo(req: AuthedRequest, res: Response) {
  const parsed = generateVideoSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const userId = req.user!.userId;
  const sourceImageUrl = parsed.data.sourceImageUrl
    ? toPublicUrl(parsed.data.sourceImageUrl)
    : undefined;
  const sourceVideoUrl = parsed.data.sourceVideoUrl
    ? toPublicUrl(parsed.data.sourceVideoUrl)
    : undefined;

  let job;
  try {
    job = await startVideoJob(parsed.data.prompt, sourceImageUrl, sourceVideoUrl);
  } catch (err) {
    throw new ApiError(502, friendlyProviderError(err, "video.controller"));
  }

  const record = await prisma.videoGeneration.create({
    data: {
      userId,
      prompt: parsed.data.prompt,
      sourceImageUrl: parsed.data.sourceImageUrl,
      sourceVideoUrl: parsed.data.sourceVideoUrl,
      status: "PROCESSING",
      provider: "replicate",
      providerJobId: job.providerJobId,
    },
  });

  res.status(201).json({ video: withSignedUrls(record) });
}

export async function listVideos(req: AuthedRequest, res: Response) {
  const videos = await prisma.videoGeneration.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  res.json({ videos: videos.map(withSignedUrls) });
}

/**
 * Fetching a single video also refreshes its status from the provider if still in
 * progress — the simplest correct approach without adding websockets/polling
 * infrastructure. The frontend polls this endpoint on an interval while a video is
 * PENDING/PROCESSING (see hooks/useVideoStatus.ts).
 */
export async function getVideo(req: AuthedRequest, res: Response) {
  const video = await prisma.videoGeneration.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!video) throw new ApiError(404, "Video not found");

  if (video.status === "PENDING" || video.status === "PROCESSING") {
    try {
      const result = await pollVideoJob(video.providerJobId);
      if (result.status !== video.status) {
        const updated = await prisma.videoGeneration.update({
          where: { id: video.id },
          data: {
            status: result.status,
            url: result.url,
            error: result.error,
          },
        });
        return res.json({ video: withSignedUrls(updated) });
      }
    } catch (err) {
      // Transient provider errors while polling shouldn't fail the read — return the
      // last known state and let the next poll try again.
      console.error("Video status poll failed:", err);
    }
  }

  res.json({ video: withSignedUrls(video) });
}

export async function deleteVideo(req: AuthedRequest, res: Response) {
  const video = await prisma.videoGeneration.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!video) throw new ApiError(404, "Video not found");
  await prisma.videoGeneration.delete({ where: { id: video.id } });
  res.status(204).end();
}

/** Uploads a source image for image-to-video generation. */
export async function uploadVideoSource(req: AuthedRequest, res: Response) {
  const file = (req as unknown as { file?: Express.Multer.File }).file;
  if (!file) throw new ApiError(400, "No file uploaded");

  if (!matchesFileSignature(file.buffer, [file.mimetype])) {
    throw new ApiError(400, "File content doesn't match its declared type");
  }

  const extension = (file.mimetype.split("/")[1] || "png").replace("jpeg", "jpg");
  const url = await saveBuffer(file.buffer, "video-sources", extension);
  res.status(201).json({ url: signLocalUploadUrl(url) });
}

/** Uploads a source video for video-to-video generation. Mirrors uploadVideoSource above. */
export async function uploadVideoSourceVideo(req: AuthedRequest, res: Response) {
  const file = (req as unknown as { file?: Express.Multer.File }).file;
  if (!file) throw new ApiError(400, "No file uploaded");

  if (!matchesFileSignature(file.buffer, [file.mimetype])) {
    throw new ApiError(400, "File content doesn't match its declared type");
  }

  const extension = (file.mimetype.split("/")[1] || "mp4").replace("quicktime", "mov");
  const url = await saveBuffer(file.buffer, "video-sources", extension);
  res.status(201).json({ url: signLocalUploadUrl(url) });
}
