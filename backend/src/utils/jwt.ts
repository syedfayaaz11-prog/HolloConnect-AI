import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

// jsonwebtoken's SignOptions.expiresIn is typed as `StringValue | number` (StringValue is a
// template-literal type from the `ms` package, e.g. "7d"/"12h"/"30m" — not a general
// `string`). `process.env.JWT_EXPIRES_IN || "7d"` is inferred as plain `string` since the
// left side of `||` is `string | undefined`, so TypeScript can't confirm it matches that
// narrow pattern at compile time even though it always will at runtime for any sane value
// (it's an env var, so it can't be a literal type by construction). Asserting to the exact
// expected type here — not `any` — is the correct fix; an actually malformed value (e.g.
// "7 days") would still fail loudly at runtime inside jsonwebtoken itself, same as before.
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"];

if (!JWT_SECRET) {
  // Fail loudly at startup rather than silently signing tokens with `undefined`.
  throw new Error("JWT_SECRET is not set. Add it to backend/.env");
}

export interface JwtPayload {
  userId: string;
  role: "USER" | "ADMIN";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
