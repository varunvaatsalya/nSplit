import { connectDb } from "@/lib/db";
import { Group, findActiveMemberById } from "@/models";
import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { resendMemberInvite } from "@/lib/invitations";

export async function POST(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code, memberId } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(
      auth.user._id,
      code,
      Actions.MANAGE_MEMBERS
    );
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const group = await Group.findById(membership.groupId);
  if (!group) return fail("Group not found", 404);

  const member = findActiveMemberById(group, memberId);
  if (!member) return fail("Member not found", 404);

  try {
    const result = await resendMemberInvite({
      group,
      member,
      invitedBy: auth.user,
    });
    return ok(result);
  } catch (e) {
    return fail(e.message, e.status || 400, e.code);
  }
}
