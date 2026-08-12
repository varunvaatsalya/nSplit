import { connectDb } from "@/lib/db";
import { PasswordResetToken, User } from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import { destroyAllUserSessions } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { withTransaction } from "@/lib/db";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const tokenHash = hashToken(parsed.data.token);
  const reset = await PasswordResetToken.findOne({ tokenHash }).lean();

  if (!reset || reset.usedAt || new Date(reset.expiresAt).getTime() < Date.now()) {
    return fail("Invalid or expired reset token", 400, "INVALID_RESET_TOKEN");
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    await User.updateOne({ _id: reset.userId }, { passwordHash }, opts);
    await PasswordResetToken.updateOne(
      { _id: reset._id },
      { usedAt: new Date() },
      opts
    );
  });

  await destroyAllUserSessions(reset.userId);

  return ok({ success: true });
}
