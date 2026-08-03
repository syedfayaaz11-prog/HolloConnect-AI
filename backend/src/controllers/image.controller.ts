import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { friendlyProviderError } from "../utils/friendlyError";
import { generateImageSchema } from "../utils/validation";
import { generateImage } from "../services/imagegen.service";
import { deleteFile, readBuffer, saveBuffer } from "../services/storage.service";
import { signLocalUploadUrl } from "../utils/signedFileUrl";
import { matchesFileSignature } from "../utils/fileSignature";

// GeneratedImage.url is a local /uploads path — every response exposing it needs to sign it
// first, since the uploads route (routes/uploads.routes.ts) rejects unsigned requests.
function withSignedUrl<T extends { url: string }>(image: T): T {
  return { ...image, url: signLocalUploadUrl(image.url) };
}

export async function createImage(req: AuthedRequest, res: Response) {
  const parsed = generateImageSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const size = parsed.data.size ?? "1024x1024";

  // Reference image is optional — parsed.data.referenceImageUrl is our own signed /uploads
  // path from POST /api/images/upload-source (see uploadImageSource below), so this reads
  // the actual bytes back off disk to forward to the edits endpoint.
  let referenceImage: { buffer: Buffer; mimetype: string } | undefined;
  if (parsed.data.referenceImageUrl) {
    const buffer = await readBuffer(parsed.data.referenceImageUrl);
    if (!buffer) throw new ApiError(400, "Reference image not found — please re-upload it.");
    const ext = parsed.data.referenceImageUrl.split(".").pop()?.toLowerCase() ?? "png";
    const mimetype = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
    referenceImage = { buffer, mimetype };
  }

  let result;
  try {
    result = await generateImage(parsed.data.prompt, size, referenceImage);
  } catch (err) {
    throw new ApiError(502, friendlyProviderError(err, "image.controller"));
  }

  const url = await saveBuffer(result.buffer, "images", result.extension);

  const record = await prisma.generatedImage.create({
    data: {
      userId: req.user!.userId,
      prompt: parsed.data.prompt,
      url,
      provider: referenceImage ? "openai:gpt-image-1" : "openai:dall-e-3",
      size,
    },
  });

  res.status(201).json({ image: withSignedUrl(record) });
}

/** Uploads a reference image for image-to-image generation (Image AI's "+" button). Mirrors
    video.controller.ts's uploadVideoSource. */
export async function uploadImageSource(req: AuthedRequest, res: Response) {
  const file = (req as unknown as { file?: Express.Multer.File }).file;
  if (!file) throw new ApiError(400, "No file uploaded");

  if (!matchesFileSignature(file.buffer, [file.mimetype])) {
    throw new ApiError(400, "File content doesn't match its declared type");
  }

  const extension = (file.mimetype.split("/")[1] || "png").replace("jpeg", "jpg");
  const url = await saveBuffer(file.buffer, "image-sources", extension);
  res.status(201).json({ url: signLocalUploadUrl(url) });
}

export async function listImages(req: AuthedRequest, res: Response) {
  const images = await prisma.generatedImage.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  res.json({ images: images.map(withSignedUrl) });
}

export async function getImage(req: AuthedRequest, res: Response) {
  const image = await prisma.generatedImage.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!image) throw new ApiError(404, "Image not found");
  res.json({ image: withSignedUrl(image) });
}

export async function deleteImage(req: AuthedRequest, res: Response) {
  const image = await prisma.generatedImage.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!image) throw new ApiError(404, "Image not found");

  await deleteFile(image.url);
  await prisma.generatedImage.delete({ where: { id: image.id } });
  res.status(204).end();
}
