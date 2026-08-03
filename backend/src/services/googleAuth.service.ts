/**
 * Verifies a Google Identity Services ID token server-side.
 *
 * Uses Google's own `tokeninfo` endpoint (a plain HTTPS GET, Google validates the signature
 * and expiry on their end and returns the decoded claims) rather than a JWT/JWKS-verification
 * library — there's no way to install a new npm dependency in this sandbox (the registry
 * blocks tarball fetches with a 403, documented elsewhere in this project's history), and
 * this endpoint is a real, supported part of Google's OAuth2 API, not a hack. It's slightly
 * higher-latency than local JWKS verification (one extra network round-trip per sign-in) —
 * worth swapping for `google-auth-library`'s `OAuth2Client.verifyIdToken` in a real
 * deployment where installing it is possible, but functionally correct as-is: Google is
 * still the one actually checking the signature, we're just asking them directly instead of
 * doing the RS256/JWKS math ourselves.
 */

export interface GoogleProfile {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function verifyGoogleIdToken(credential: string): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new ConfigError("Google Sign-In is not configured on this server (GOOGLE_CLIENT_ID unset).");
  }

  let response: Response;
  try {
    response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
  } catch {
    throw new VerificationError("Could not reach Google to verify sign-in. Please try again.");
  }

  if (!response.ok) {
    throw new VerificationError("Google Sign-In failed: the token is invalid or has expired.");
  }

  const claims = (await response.json()) as Record<string, string>;

  // `aud` must be *our* client id — otherwise this is a valid Google token minted for some
  // other application, which must not be accepted as proof of identity for this one.
  if (claims.aud !== clientId) {
    throw new VerificationError("Google Sign-In failed: token was not issued for this application.");
  }
  if (claims.email_verified !== "true") {
    throw new VerificationError("Your Google account's email address is not verified.");
  }
  if (!claims.sub || !claims.email) {
    throw new VerificationError("Google Sign-In failed: incomplete profile returned.");
  }

  return {
    googleId: claims.sub,
    email: claims.email,
    name: claims.name,
    picture: claims.picture,
  };
}

/** Distinct error types so the controller can map them to the right HTTP status without
    string-matching messages. */
export class ConfigError extends Error {}
export class VerificationError extends Error {}
