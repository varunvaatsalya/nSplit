import { connectDb, toJSON, withTransaction } from "@/lib/db";
import {
  Group,
  User,
  activeMembers,
  findGroupByCode,
  serializeMember,
} from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { backfillGroupMemberAvatars } from "@/lib/avatar-assign";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { updateGroupSchema } from "@/lib/validations/groups";

async function loadGroup(code) {
  let group = await findGroupByCode(code);
  if (!group) return null;

  const members = activeMembers(group);
  const users = await User.find({
    _id: { $in: members.map((m) => m.userId).filter(Boolean) },
  })
    .select("name email avatar avatarUrl avatarColor")
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const dirty = await backfillGroupMemberAvatars(group, userMap);
  if (dirty) {
    await group.save();
  }

  const lean = group.toObject();
  const settings = lean.settings || {};
  return {
    ...toJSON(lean),
    createdById: String(lean.createdById),
    settings: {
      defaultSplitMethod: ["EQUAL", "EXACT", "SHARES"].includes(
        settings.defaultSplitMethod
      )
        ? settings.defaultSplitMethod
        : "EQUAL",
      defaultSplitConfig: Array.isArray(settings.defaultSplitConfig)
        ? settings.defaultSplitConfig
        : null,
      simplifyDebts: Boolean(settings.simplifyDebts),
    },
    members: activeMembers(lean).map((m) =>
      serializeMember(m, m.userId ? userMap.get(String(m.userId)) : null)
    ),
    invitations: undefined,
  };
}

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
  const group = await loadGroup(code);
  if (!group) return fail("Group not found", 404);
  return ok({ group });
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(
      auth.user._id,
      code,
      Actions.MANAGE_SETTINGS
    );
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
    await Group.updateOne({ _id: membership.groupId }, { $set, $inc: { version: 1 } }, opts);
    await recordActivity({
      session,
      groupId: membership.groupId,
      actorId: auth.user._id,
      action: "GROUP_UPDATED",
      entityType: "group",
      entityId: membership.groupId,
      metadata: $set,
    });
  });

  return ok({ group: await loadGroup(code) });
}

export async function DELETE(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  try {
    await requireGroupPermission(auth.user._id, code, Actions.MANAGE_SETTINGS);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const group = await findGroupByCode(code).lean();
  if (!group) return fail("Group not found", 404);
  if (String(group.createdById) !== String(auth.user._id)) {
    return fail("Only the group creator can delete the group", 403);
  }

  await Group.deleteOne({ _id: group._id });
  return ok({ success: true });
}
