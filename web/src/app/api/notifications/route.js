import { connectDb, toJSON } from "@/lib/db";
import { Notification } from "@/models";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  listInvitationsForUser,
  syncInvitationsForUser,
} from "@/lib/invitations";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await connectDb();
  await syncInvitationsForUser(auth.user);
  const [notifications, invitations] = await Promise.all([
    Notification.find({ userId: auth.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    listInvitationsForUser(auth.user),
  ]);

  return ok({
    notifications: notifications.map((n) => ({
      ...toJSON(n),
      userId: String(n.userId),
    })),
    invitations: invitations.filter((inv) =>
      ["PENDING", "EXPIRED"].includes(inv.status)
    ),
  });
}
