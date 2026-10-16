import { connectDb } from "@/lib/db";
import { fail, ok, zodError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth/session";
import { SHARE_TOKEN } from "@/lib/share";
import { LIMITS, joinRequestSchema, serializeRequest } from "@/lib/share-requests";
import { Group, ShareRequest, activeMembers } from "@/models";

async function load(params) {
  const { token } = await params;
  if (!SHARE_TOKEN.test(String(token || ""))) return { error: fail("This link is not valid", 404) };
  await connectDb();
  const group = await Group.findOne({ "share.token": token }).lean();
  if (!group) return { error: fail("This link was turned off or does not exist", 404) };
  return { group };
}

function membershipOf(group, userId) {
  return activeMembers(group).find((m) => m.userId && String(m.userId) === String(userId));
}

/**
 * Where the signed-in viewer stands with this group:
 * signed-out | member (with the group code to open it) | pending | rejected | none.
 */
export async function GET(_request, { params }) {
  const { error, group } = await load(params);
  if (error) return error;
  const session = await getSessionUser();
  if (!session?.user) return ok({ status: "signed-out" });

  if (membershipOf(group, session.user._id)) return ok({ status: "member", groupCode: group.code });
  const last = await ShareRequest.findOne({ groupId: group._id, kind: "join", requesterUserId: session.user._id })
    .sort({ createdAt: -1 })
    .lean();
  if (!last) return ok({ status: "none" });
  return ok({ status: last.status === "PENDING" ? "pending" : "rejected", request: serializeRequest(last) });
}

/** Ask to join as one of the group's members. A group admin approves it. */
export async function POST(request, { params }) {
  const { error, group } = await load(params);
  if (error) return error;
  const session = await getSessionUser();
  if (!session?.user) return fail("Log in to join this group", 401);
  const user = session.user;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }
  const parsed = joinRequestSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  if (membershipOf(group, user._id)) return fail("You're already in this group", 409);
  const member = activeMembers(group).find((m) => String(m._id) === parsed.data.memberId);
  if (!member) return fail("That name is no longer in the group", 422);
  if (member.userId) return fail("Someone already joined as this name", 409);

  const pendingInGroup = await ShareRequest.countDocuments({ groupId: group._id, kind: "join", status: "PENDING" });
  if (pendingInGroup >= LIMITS.pendingJoinsPerGroup) {
    return fail("This group has many join requests waiting. Try again later.", 429);
  }

  // One pending join per person: a new choice replaces the old one.
  const row = await ShareRequest.findOneAndUpdate(
    { groupId: group._id, kind: "join", requesterUserId: user._id, status: "PENDING" },
    {
      $set: {
        submittedByMemberId: member._id,
        submitterName: member.displayName,
        requesterName: user.name,
        requesterEmail: user.email,
        payload: {},
      },
      $setOnInsert: { groupId: group._id, kind: "join", status: "PENDING", requesterUserId: user._id },
    },
    { new: true, upsert: true }
  ).lean();
  return ok({ status: "pending", request: serializeRequest(row) });
}
