import { connectDb } from "@/lib/db";
import {
  Group,
  User,
  findActiveMemberById,
  serializeMember,
} from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { updateMemberSchema } from "@/lib/validations/groups";

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: groupId, memberId } = await params;
  try {
    await requireGroupPermission(auth.user.id, groupId, Actions.MANAGE_MEMBERS);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const group = await Group.findById(groupId);
  if (!group) return fail("Group not found", 404);

  const member = findActiveMemberById(group, memberId);
  if (!member) return fail("Member not found", 404);

  if (parsed.data.permission !== undefined) member.permission = parsed.data.permission;
  if (parsed.data.displayName !== undefined) member.displayName = parsed.data.displayName;
  if (parsed.data.email !== undefined) member.email = parsed.data.email;

  await group.save();

  if (parsed.data.permission !== undefined) {
    await recordActivity({
      groupId,
      actorId: auth.user.id,
      action: "MEMBER_PERMISSION_CHANGED",
      entityType: "member",
      entityId: memberId,
      metadata: { permission: parsed.data.permission },
    });
  }

  const user = member.userId
    ? await User.findById(member.userId)
        .select("name email avatar avatarUrl avatarColor")
        .lean()
    : null;

  return ok({ member: serializeMember(member, user) });
}

export async function DELETE(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: groupId, memberId } = await params;
  try {
    await requireGroupPermission(auth.user.id, groupId, Actions.MANAGE_MEMBERS);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const group = await Group.findById(groupId);
  if (!group) return fail("Group not found", 404);

  const member = findActiveMemberById(group, memberId);
  if (!member) return fail("Member not found", 404);

  member.leftAt = new Date();
  await group.save();

  await recordActivity({
    groupId,
    actorId: auth.user.id,
    action: "MEMBER_REMOVED",
    entityType: "member",
    entityId: memberId,
    metadata: { userId: member.userId ? String(member.userId) : null },
  });

  return ok({ success: true });
}
