import { connectDb, toJSON } from "@/lib/db";
import { Notification } from "@/models";
import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";

export async function PATCH(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  await connectDb();

  const notification = await Notification.findOne({
    _id: id,
    userId: auth.user._id,
  }).lean();
  if (!notification) return fail("Notification not found", 404);

  await Notification.updateOne({ _id: id }, { readAt: new Date() });
  const updated = await Notification.findById(id).lean();

  return ok({
    notification: {
      ...toJSON(updated),
      userId: String(updated.userId),
    },
  });
}
