import { connectDb, withTransaction } from "@/lib/db";
import { Group } from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { updateSettingsSchema } from "@/lib/validations/groups";

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  try {
    await requireGroupPermission(auth.user._id, code, Actions.VIEW_GROUP);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const group = await Group.findOne({ code }).lean();
  if (!group?.settings) return fail("Settings not found", 404);

  return ok({
    settings: {
      groupId: String(group._id),
      code: group.code,
      ...group.settings,
      updatedAt: group.updatedAt,
    },
  });
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.MANAGE_SETTINGS);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }
  const groupId = membership.groupId;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const $set = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    $set[`settings.${key}`] = value;
  }

  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    await Group.updateOne({ _id: groupId }, { $set, $inc: { version: 1 } }, opts);
    await recordActivity({
      session,
      groupId,
      actorId: auth.user._id,
      action: "SETTINGS_CHANGED",
      entityType: "settings",
      entityId: groupId,
      metadata: parsed.data,
    });
  });

  const group = await Group.findById(groupId).lean();
  return ok({
    settings: {
      groupId,
      ...group.settings,
      updatedAt: group.updatedAt,
    },
  });
}
