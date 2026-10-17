import { connectDb } from "@/lib/db";
import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { Group, activeMembers } from "@/models";

/**
 * Leave a group. The last admin can't leave while others with an account are
 * still in it (they'd be stuck without anyone to manage the group).
 */
export async function POST(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  await connectDb();
  const group = await Group.findOne({ code });
  if (!group) return fail("Group not found", 404);

  const members = activeMembers(group);
  const me = members.find((m) => m.userId && String(m.userId) === String(auth.user._id));
  if (!me) return fail("You're not part of this group", 403);

  if (me.permission === "ADMIN") {
    const others = members.filter((m) => m.userId && String(m.userId) !== String(auth.user._id));
    const otherAdmins = others.filter((m) => m.permission === "ADMIN");
    if (!otherAdmins.length) {
      return others.length
        ? fail("You're the only admin. Make someone else an admin before you leave.", 400, "LAST_ADMIN")
        : fail("You're the only person here with an account. Delete the group instead.", 400, "LAST_ACCOUNT");
    }
  }

  me.leftAt = new Date();
  await group.save();
  await recordActivity({
    groupId: group._id,
    actorId: auth.user._id,
    action: "MEMBER_LEFT",
    entityType: "member",
    entityId: me._id,
    metadata: { userId: String(auth.user._id) },
  });

  return ok({ left: true, groupId: String(group._id) });
}
