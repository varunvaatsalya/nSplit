import { cookies, headers } from "next/headers";
import { connectDb, idOf } from "@/lib/db";
import { Session, User } from "@/models";
import { ensureUserAvatar } from "@/lib/avatar-assign";
import { publicAvatar } from "@/lib/avatar";
import {
  SESSION_COOKIE,
  cookieOptions,
  generateToken,
  hashToken,
  sessionExpiryDate,
} from "@/lib/auth/tokens";

export async function createSession(userId, { deviceId, userAgent, ip } = {}) {
  await connectDb();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = sessionExpiryDate();

  await Session.create({
    userId,
    tokenHash,
    deviceId: deviceId || null,
    userAgent: userAgent || null,
    ip: ip || null,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function destroySessionByToken(token) {
  if (!token) return;
  await connectDb();
  await Session.deleteMany({ tokenHash: hashToken(token) });
}

export async function destroyAllUserSessions(userId) {
  await connectDb();
  await Session.deleteMany({ userId });
}

export async function getSessionUser() {
  await connectDb();
  const token = await extractSessionToken();
  if (!token) return null;

  const session = await Session.findOne({ tokenHash: hashToken(token) }).lean();
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await Session.deleteOne({ _id: session._id }).catch(() => {});
    return null;
  }

  const user = await User.findById(session.userId)
    .select("email name avatar avatarUrl avatarColor createdAt updatedAt")
    .lean();
  if (!user) return null;

  await ensureUserAvatar(user);

  return {
    user: publicUser(user),
    session: { ...session, id: idOf(session) },
    token,
  };
}

async function extractSessionToken() {
  const headerStore = await headers();
  const auth = headerStore.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token, expiresAt) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    ...cookieOptions(new Date(0)),
    maxAge: 0,
  });
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: idOf(user),
    email: user.email,
    name: user.name,
    avatar: publicAvatar(user.avatar, user.name),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
