import { connectDb } from "@/lib/db";
import { Activity, User } from "@/models";
import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { serializeActivity } from "@/lib/activity";

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.VIEW_ACTIVITY);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }
  const groupId = membership.groupId;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  await connectDb();
  const activities = await Activity.find({ groupId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const actors = await User.find({
    _id: { $in: activities.map((a) => a.actorId) },
  })
    .select("name email avatar avatarUrl avatarColor")
    .lean();
  const actorMap = new Map(actors.map((u) => [String(u._id), u]));

  return ok({
    activities: activities.map((a) =>
      serializeActivity(a, actorMap.get(String(a.actorId)))
    ),
  });
}
