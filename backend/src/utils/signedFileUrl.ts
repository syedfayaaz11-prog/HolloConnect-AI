import crypto from "crypto";

// Falls back to deriving a distinct key from JWT_SECRET (never the raw secret itself) if
// FILE_SIGNING_SECRET isn't set, so existing deployments don't break on upgrade without an
// immediate .env change — but production should set FILE_SIGNING_SECRET explicitly (see
// .env.example) so the two signing domains don't share key material at all.
function getSigningKey(): string {
  const dedicated = process.env.FILE_SIGNING_SECRET;
  if (dedicated) return dedicated;
  const jwtSecret = process.env.JWT_SECRET as string;
  return crypto.createHash("sha256").update(`${jwtSecret}:file-url-signing`).digest("hex");
}

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour — long enough for a page session/provider fetch, short enough to bound a leaked-link's usefulness

function sign(pathOnly: string, exp: number): string {
  return crypto.createHmac("sha256", getSigningKey()).update(`${pathOnly}:${exp}`).digest("hex");
}

/**
 * Wraps a locally-stored /uploads/... URL with an expiring signature. Leaves anything else
 * (already-absolute external URLs — e.g. a completed video's provider CDN link — or
 * null/undefined) untouched, so callers can run every URL-shaped field through this
 * unconditionally rather than needing to know which fields are local uploads.
 */
export function signLocalUploadUrl<T extends string | null | undefined>(
  url: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): T {
  if (!url || !url.startsWith("/uploads/")) return url;
  const pathOnly = url.split("?")[0]; // re-signing an already-signed URL replaces, not doubles, the signature
  const exp = Date.now() + ttlSeconds * 1000;
  const sig = sign(pathOnly, exp);
  return `${pathOnly}?exp=${exp}&sig=${sig}` as T;
}

/** Verifies a signature produced by signLocalUploadUrl for the given request path. */
export function verifyUploadSignature(pathOnly: string, expParam: unknown, sigParam: unknown): boolean {
  if (typeof expParam !== "string" || typeof sigParam !== "string") return false;
  const exp = Number(expParam);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const expected = sign(pathOnly, exp);
  const expectedBuf = Buffer.from(expected, "hex");
  const givenBuf = Buffer.from(sigParam, "hex");
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}
