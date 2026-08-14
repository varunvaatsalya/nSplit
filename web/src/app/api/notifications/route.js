import { connectDb, toJSON } from "@/lib/db";
import { Notification } from "@/models";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await connectDb();
  const notifications = await Notification.find({ userId: auth.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return ok({
    notifications: notifications.map((n) => ({
      ...toJSON(n),
      userId: String(n.userId),
    })),
  });
}
