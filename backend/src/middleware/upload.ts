import multer, { FileFilterCallback } from "multer";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "./errorHandler";

// In-memory storage: files are handed to storage.service.saveBuffer() by the controller
// rather than written to disk by multer directly, so every upload path goes through the
// same storage abstraction (and the same future S3/Cloudinary swap point).
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB — a source image for video, not a huge asset
const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15MB — a few minutes of voice dictation

// Every mimetype this app's own processing code actually understands — see
// documentExtract.service.ts for the document list. fileFilter only trusts the client-
// supplied Content-Type header (trivially spoofable), so this is the first of two checks;
// controllers additionally verify the real file bytes via utils/fileSignature.ts.
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
];

export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Reference video for video-to-video generation — kept separate from IMAGE_MIME_TYPES/
// MAX_IMAGE_BYTES above since a source video is a meaningfully larger asset than a source
// image, and only meaningful at all if the deployment's configured Replicate model version
// actually accepts a video input (see videogen.service.ts).
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB — a short reference clip
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
];

function fileFilterFor(allowed: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!allowed.includes(file.mimetype)) {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  };
}

export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES },
  fileFilter: fileFilterFor(DOCUMENT_MIME_TYPES),
});

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
});

export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: fileFilterFor(VIDEO_MIME_TYPES),
});

export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES },
  fileFilter: fileFilterFor(AUDIO_MIME_TYPES),
});

/**
 * multer's own errors (wrong file type from fileFilter, file too large) arrive as a plain
 * Error/MulterError passed to `next`, which errorHandler.ts would otherwise treat as an
 * unexpected 500 — this converts them into the proper 400 ApiError instead, since both are
 * ordinary client-input problems, not server bugs.
 */
export function wrapMulter(middleware: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err?: unknown) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        return next(new ApiError(400, err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message));
      }
      return next(new ApiError(400, (err as Error).message || "Invalid file upload"));
    });
  };
}
