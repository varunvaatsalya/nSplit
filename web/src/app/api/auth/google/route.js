import { headers } from "next/headers";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { User } from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { GoogleTokenError, verifyGoogleIdToken } from "@/lib/auth/google";
import { createSession, publicUser, setSessionCookie } from "@/lib/auth/session";
import { allocateUserAvatar, ensureUserAvatar } from "@/lib/avatar-assign";
import { syncInvitationsForUser } from "@/lib/invitations";

const schema = z.object({
  idToken: z.string().min(20).max(5000),
  deviceId: z.string().max(200).optional(),
});

/**
 * Log in or sign up with a Google ID token (from the web button or the app).
 * An existing account with the same verified email is linked, not duplicated.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  let google;
  try {
    google = await verifyGoogleIdToken(parsed.data.idToken);
  } catch (e) {
    if (e instanceof GoogleTokenError) return fail(e.message, 401, "GOOGLE_AUTH_FAILED");
    throw e;
  }

  await connectDb();
  const account = { provider: "google", providerAccountId: google.sub };
  let user = await User.findOne({ oauthAccounts: { $elemMatch: account } }).lean();
  let isNew = false;

  if (!user) {
    const byEmail = await User.findOne({ email: google.email }).lean();
    if (byEmail) {
      // Google has verified this email, so it is safe to link it to the account.
      user = await User.findByIdAndUpdate(
        byEmail._id,
        {
          $push: { oauthAccounts: account },
          ...(byEmail.emailVerified ? {} : { $set: { emailVerified: new Date() } }),
        },
        { new: true }
      ).lean();
    } else {
      const name = google.name || google.email.split("@")[0];
      const created = await User.create({
        name,
        email: google.email,
        emailVerified: new Date(),
        avatar: await allocateUserAvatar(name),
        oauthAccounts: [account],
      });
      user = created.toObject();
      isNew = true;
    }
  }

  const headerStore = await headers();
  const { token, expiresAt } = await createSession(user._id, {
    deviceId: parsed.data.deviceId,
    userAgent: headerStore.get("user-agent"),
    ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });
  await setSessionCookie(token, expiresAt);
  await ensureUserAvatar(user);
  const invitations = await syncInvitationsForUser(user);

  return ok({ user: publicUser(user), token, expiresAt, invitations, isNew });
}
