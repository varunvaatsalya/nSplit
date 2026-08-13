import { headers } from "next/headers";
import { connectDb, idOf } from "@/lib/db";
import { User } from "@/models";
import { created, fail, zodError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  publicUser,
  setSessionCookie,
} from "@/lib/auth/session";
import { allocateUserAvatar } from "@/lib/avatar-assign";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const { name, email, password } = parsed.data;
  await connectDb();

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return fail("An account with this email already exists", 409, "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(password);
  const headerStore = await headers();
  const avatar = await allocateUserAvatar(name);
  const user = await User.create({ name, email, passwordHash, avatar });

  const { token, expiresAt } = await createSession(user._id, {
    deviceId: body.deviceId,
    userAgent: headerStore.get("user-agent"),
    ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  await setSessionCookie(token, expiresAt);

  return created({
    user: publicUser({ ...user.toObject(), _id: user._id }),
    token,
    expiresAt,
  });
}
