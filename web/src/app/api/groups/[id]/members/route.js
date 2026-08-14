import { connectDb } from "@/lib/db";
import {
  Group,
  Notification,
  User,
  activeMembers,
  serializeMember,
} from "@/models";
import { created, fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import {
  allocateMemberAvatar,
  collectGroupUsedAvatars,
  ensureUserAvatar,
} from "@/lib/avatar-assign";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { addMemberSchema } from "@/lib/validations/groups";

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.VIEW_MEMBERS);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }
  const groupId = membership.groupId;

  await connectDb();
  const group = await Group.findById(groupId).lean();
  if (!group) return fail("Group not found", 404);

  const members = activeMembers(group);
  const users = await User.find({
    _id: { $in: members.map((m) => m.userId).filter(Boolean) },
  })
    .select("name email avatar avatarUrl avatarColor")
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return ok({
    members: members.map((m) =>
      serializeMember(m, m.userId ? userMap.get(String(m.userId)) : null)
    ),
  });
}

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.MANAGE_MEMBERS);
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

  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const { name, email, invite, permission } = parsed.data;
  await connectDb();

  const group = await Group.findById(groupId);
  if (!group) return fail("Group not found", 404);

  let linkedUser = null;
  if (email) {
    linkedUser = await User.findOne({ email }).lean();
    const active = activeMembers(group);
    if (
      linkedUser &&
      active.some((m) => m.userId && String(m.userId) === String(linkedUser._id))
    ) {
      return fail("User is already a member", 409, "ALREADY_MEMBER");
    }
    if (active.some((m) => m.email && m.email === email)) {
      return fail("A member with this email is already in the group", 409);
    }
  }

  if (linkedUser) await ensureUserAvatar(linkedUser);

  const memberPermission = permission || "ADD";
  const active = activeMembers(group);
  const linkedIds = active.map((m) => m.userId).filter(Boolean);
  const existingUsers = linkedIds.length
    ? await User.find({ _id: { $in: linkedIds } })
        .select("name avatar avatarUrl avatarColor")
        .lean()
    : [];
  const userMap = new Map(existingUsers.map((u) => [String(u._id), u]));
  const used = collectGroupUsedAvatars(active, userMap);
  const avatar = allocateMemberAvatar(name, used, linkedUser);

  if (linkedUser) {
    const previous = group.members.find(
      (m) => m.userId && String(m.userId) === String(linkedUser._id) && m.leftAt
    );
    if (previous) {
      previous.leftAt = null;
      previous.permission = memberPermission;
      previous.displayName = name;
      previous.email = email || previous.email || linkedUser.email;
      previous.avatar =
        previous.avatar?.letters && previous.avatar?.bg
          ? previous.avatar
          : avatar;
      previous.joinedAt = new Date();
      await group.save();

      await recordActivity({
        groupId,
        actorId: auth.user._id,
        action: "MEMBER_ADDED",
        entityType: "member",
        entityId: previous._id,
        metadata: { displayName: name, email, permission: memberPermission },
      });

      return created({ member: serializeMember(previous, linkedUser) });
    }
  }

  const memberDoc = {
    userId: linkedUser?._id ?? null,
    email: email || null,
    permission: memberPermission,
    displayName: name,
    avatar,
    joinedAt: new Date(),
    leftAt: null,
  };

  group.members.push(memberDoc);

  if (invite && email) {
    group.invitations.push({
      email,
      invitedById: auth.user._id,
      recipientId: linkedUser?._id ?? null,
      permission: memberPermission,
      status: "PENDING",
      tokenHash: hashToken(generateToken()),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      createdAt: new Date(),
    });
  }

  await group.save();
  const saved = group.members[group.members.length - 1];

  await recordActivity({
    groupId,
    actorId: auth.user._id,
    action: "MEMBER_ADDED",
    entityType: "member",
    entityId: saved._id,
    metadata: {
      displayName: name,
      email,
      permission: memberPermission,
      invited: Boolean(invite && email),
    },
  });

  if (invite && email && linkedUser) {
    await Notification.create({
      userId: linkedUser._id,
      type: "INVITATION",
      title: "Group invitation",
      body: `${auth.user.name} invited you to a group`,
      data: { groupId },
    });
  }

  return created({ member: serializeMember(saved, linkedUser) });
}
