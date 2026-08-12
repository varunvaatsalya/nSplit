import { connectDb, idOf, toJSON, withTransaction } from "@/lib/db";
import {
  Group,
  User,
  activeMembers,
  serializeMember,
} from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { updateGroupSchema } from "@/lib/validations/groups";

async function loadGroup(id) {
  const group = await Group.findById(id).lean();
  if (!group) return null;

  const members = activeMembers(group);
  const users = await User.find({
    _id: { $in: members.map((m) => m.userId).filter(Boolean) },
  })
    .select("name email avatarUrl")
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return {
    ...toJSON(group),
    createdById: String(group.createdById),
    settings: group.settings || null,
    members: members.map((m) =>
      serializeMember(m, m.userId ? userMap.get(String(m.userId)) : null)
    ),
    invitations: undefined,
  };
}

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    await requireGroupPermission(auth.user.id, id, Actions.VIEW_GROUP);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const group = await loadGroup(id);
  if (!group) return fail("Group not found", 404);
  return ok({ group });
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    await requireGroupPermission(auth.user.id, id, Actions.MANAGE_SETTINGS);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const $set = {};
  for (const key of ["name", "description", "icon", "imageUrl", "currency"]) {
    if (parsed.data[key] !== undefined) $set[key] = parsed.data[key];
  }
  if (parsed.data.defaultSplitMethod !== undefined) {
    $set["settings.defaultSplitMethod"] = parsed.data.defaultSplitMethod;
  }
  if (parsed.data.defaultSplitConfig !== undefined) {
    $set["settings.defaultSplitConfig"] = parsed.data.defaultSplitConfig;
  }

  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    await Group.updateOne({ _id: id }, { $set, $inc: { version: 1 } }, opts);
    await recordActivity({
      session,
      groupId: id,
      actorId: auth.user.id,
      action: "GROUP_UPDATED",
      entityType: "group",
      entityId: id,
      metadata: $set,
    });
  });

  return ok({ group: await loadGroup(id) });
}

export async function DELETE(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    await requireGroupPermission(auth.user.id, id, Actions.MANAGE_SETTINGS);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const group = await Group.findById(id).lean();
  if (!group) return fail("Group not found", 404);
  if (String(group.createdById) !== String(auth.user.id)) {
    return fail("Only the group creator can delete the group", 403);
  }

  await Group.deleteOne({ _id: id });
  return ok({ success: true });
}
