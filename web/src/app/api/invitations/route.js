import { connectDb } from "@/lib/db";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { listInvitationsForUser } from "@/lib/invitations";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await connectDb();
  const invitations = (await listInvitationsForUser(auth.user)).filter((inv) =>
    ["PENDING", "EXPIRED"].includes(inv.status)
  );
  return ok({ invitations });
}
