import { headers } from "next/headers";
import { connectDb } from "@/lib/db";
import { User } from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  publicUser,
  setSessionCookie,
} from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const { email, password, deviceId } = parsed.data;
  await connectDb();

  const user = await User.findOne({ email }).lean();
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const headerStore = await headers();
  const { token, expiresAt } = await createSession(user._id, {
    deviceId,
    userAgent: headerStore.get("user-agent"),
    ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  await setSessionCookie(token, expiresAt);

  return ok({
    user: publicUser(user),
    token,
    expiresAt,
  });
}
