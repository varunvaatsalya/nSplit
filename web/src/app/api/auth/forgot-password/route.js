import { connectDb } from "@/lib/db";
import { PasswordResetToken, User } from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const user = await User.findOne({ email: parsed.data.email }).lean();
  let devToken;

  if (user) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash: hashToken(token),
      expiresAt,
    });

    console.info(`[nsplit] password reset token for ${user.email}: ${token}`);
    if (process.env.NODE_ENV !== "production") {
      devToken = token;
    }
  }

  return ok(
    { success: true, message: "If that email exists, a reset link has been sent." },
    {},
    process.env.NODE_ENV !== "production" && devToken ? { devToken } : undefined
  );
}
