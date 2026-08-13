import { connectDb, idOf } from "@/lib/db";
import { User } from "@/models";
import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { publicAvatar, coerceAvatar } from "@/lib/avatar";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  if (!email) return fail("email query required", 400);

  await connectDb();
  const user = await User.findOne({ email })
    .select("name email avatar avatarUrl avatarColor")
    .lean();

  return ok({
    user: user
      ? {
          id: idOf(user),
          name: user.name,
          email: user.email,
          avatar: publicAvatar(coerceAvatar(user, user.name), user.name),
        }
      : null,
  });
}
