/**
 * File storage abstraction. Default implementation writes to local disk under
 * backend/uploads and serves it via a signed, expiring-URL route (see
 * routes/uploads.routes.ts and utils/signedFileUrl.ts) rather than raw static serving —
 * every response that hands a stored file's URL to the frontend must wrap it with
 * signLocalUploadUrl() first, or the browser will get a 403 on a bare /uploads/... link.
 *
 * To move to S3 or Cloudinary: implement `saveBuffer` against that provider's
 * upload API and return its public/CDN URL (or a provider-native presigned URL) instead of
 * a local path — callers only depend on this function's signature, not on how/where bytes
 * end up.
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");

/**
 * Strictly whitelists what an "extension" is allowed to look like before it's used to build
 * a filesystem path. Both current callers derive `extension` from user-influenced input
 * (an uploaded file's original filename or its client-supplied Content-Type header) — either
 * one can be crafted by an attacker. Without this, a filename/mimetype with no "." at all
 * (so `.split(".").pop()` returns the whole string) or containing "../" could make
 * `path.join(dir, filename)` resolve outside UPLOADS_ROOT — a path-traversal write.
 */
function sanitizeExtension(extension: string): string {
  const cleaned = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!cleaned) return "bin";
  return cleaned.slice(0, 10);
}

export async function saveBuffer(
  buffer: Buffer,
  subdir: string,
  extension: string
): Promise<string> {
  // subdir is always a hardcoded literal at every call site (e.g. "images", "documents") —
  // sanitized anyway so this function is safe even if that ever changes.
  const safeSubdir = subdir.replace(/[^a-zA-Z0-9_-]/g, "");
  const dir = path.join(UPLOADS_ROOT, safeSubdir);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${sanitizeExtension(extension)}`;
  const fullPath = path.join(dir, filename);

  // Belt-and-suspenders: confirm the final resolved path is still inside UPLOADS_ROOT
  // before writing anything to disk.
  if (!fullPath.startsWith(UPLOADS_ROOT + path.sep)) {
    throw new Error("Refusing to write file outside the uploads directory");
  }

  await fs.writeFile(fullPath, buffer);

  // Public URL path — served by the signed /uploads route (see routes/uploads.routes.ts).
  return `/uploads/${safeSubdir}/${filename}`;
}

export async function deleteFile(publicUrl: string): Promise<void> {
  if (!publicUrl.startsWith("/uploads/")) return; // not a local file (e.g. already S3/CDN)
  const relative = publicUrl.replace("/uploads/", "");
  const filePath = path.normalize(path.join(UPLOADS_ROOT, relative));
  if (!filePath.startsWith(UPLOADS_ROOT + path.sep)) return; // refuse to touch anything outside uploads/
  await fs.unlink(filePath).catch(() => {
    // Missing file on delete isn't fatal — the DB record is still the source of truth.
  });
}

/**
 * Reads back the bytes of a previously-saved local upload, given its `/uploads/...` public
 * path. Used where a stored file needs to be re-sent as request bytes to an external API
 * (e.g. forwarding a saved reference image to OpenAI's /images/edits endpoint) rather than
 * just linked to. Same path-traversal guard as deleteFile above. Returns null for anything
 * that isn't a local upload (already-external URL) or doesn't exist.
 */
export async function readBuffer(publicUrl: string): Promise<Buffer | null> {
  if (!publicUrl.startsWith("/uploads/")) return null;
  const relative = publicUrl.replace("/uploads/", "");
  const filePath = path.normalize(path.join(UPLOADS_ROOT, relative));
  if (!filePath.startsWith(UPLOADS_ROOT + path.sep)) return null;
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export const UPLOADS_DIR = UPLOADS_ROOT;
