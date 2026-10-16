import { connectDb } from "@/lib/db";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { SavedShare } from "@/models";

/** "Remove group": take a saved link off the user's home. */
export async function DELETE(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { token } = await params;
  await connectDb();
  await SavedShare.deleteMany({ userId: auth.user._id, token: String(token || "") });
  return ok({ removed: true });
}
