import { connectDb, idOf } from "@/lib/db";
import { Group, findActiveMemberByUserId } from "@/models";
import { can, assertCan } from "@/shared/permissions/index.js";

export async function getActiveMembership(userId, groupId) {
  await connectDb();
  const group = await Group.findById(groupId).lean();
  if (!group) return null;
  const membership = findActiveMemberByUserId(group, userId);
  if (!membership) return null;
  return {
    ...membership,
    id: idOf(membership),
    groupId: String(group._id),
  };
}

export async function requireGroupPermission(userId, groupId, action) {
  const membership = await getActiveMembership(userId, groupId);
  if (!membership) {
    const err = new Error("Not a member of this group");
    err.code = "FORBIDDEN";
    err.status = 403;
    throw err;
  }
  try {
    assertCan(membership.permission, action);
  } catch (e) {
    e.status = 403;
    throw e;
  }
  return membership;
}

export { can };
