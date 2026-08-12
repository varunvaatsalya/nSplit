import { createHash, randomBytes } from "crypto";

export const SESSION_COOKIE = "nsplit_session";

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiryDate(days = Number(process.env.SESSION_DAYS || 30)) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export function cookieOptions(expiresAt) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  };
}
