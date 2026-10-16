import { createRemoteJWKSet, jwtVerify } from "jose";

// GOOGLE_JWKS_URL exists only so tests can sign their own tokens; leave it unset.
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL(process.env.GOOGLE_JWKS_URL || "https://www.googleapis.com/oauth2/v3/certs")
);
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/**
 * Client ids whose ID tokens we accept. The web client id covers both the web
 * button and the Android/iOS apps (they request tokens for it as `webClientId`);
 * the iOS client id is accepted too in case a token is minted for it directly.
 */
export function googleAudiences() {
  return [process.env.GOOGLE_WEB_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID]
    .map((id) => id?.trim())
    .filter(Boolean);
}

export class GoogleTokenError extends Error {}

/** Verify a Google ID token and return the account it belongs to. */
export async function verifyGoogleIdToken(idToken) {
  const audience = googleAudiences();
  if (!audience.length) throw new GoogleTokenError("Google sign-in is not set up on the server");

  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, GOOGLE_JWKS, { issuer: GOOGLE_ISSUERS, audience }));
  } catch {
    throw new GoogleTokenError("Google sign-in failed. Please try again.");
  }
  if (!payload.sub || !payload.email) throw new GoogleTokenError("Google did not share an email address");
  if (payload.email_verified !== true) throw new GoogleTokenError("Your Google email is not verified");

  return {
    sub: String(payload.sub),
    email: String(payload.email).toLowerCase(),
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null,
  };
}
