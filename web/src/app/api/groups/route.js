import { connectDb, idOf, toJSON, withTransaction } from "@/lib/db";
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
  ensureUserAvatar,
} from "@/lib/avatar-assign";
import { createGroupSchema } from "@/lib/validations/groups";
import { generateToken, hashToken } from "@/lib/auth/tokens";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await connectDb();
  const groups = await Group.find({
    members: { $elemMatch: { userId: auth.user.id, leftAt: null } },
  })
    .sort({ updatedAt: -1 })
    .lean();

  return ok({
    groups: groups.map((g) => {
      const mine = activeMembers(g).find(
        (m) => m.userId && String(m.userId) === String(auth.user.id)
      );
      return {
        ...toJSON(g),
        memberCount: activeMembers(g).length,
        myPermission: mine?.permission || null,
        myMembershipId: mine ? idOf(mine) : null,
        members: undefined,
        invitations: undefined,
      };
    }),
  });
}

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const {
    name,
    description,
    icon,
    imageUrl,
    currency,
    defaultSplitMethod,
    defaultSplitConfig,
    members = [],
  } = parsed.data;

  const emails = members.map((m) => m.email).filter(Boolean);
  if (new Set(emails).size !== emails.length) {
    return fail("Duplicate member emails in the list", 422);
  }

  await connectDb();

  const result = await withTransaction(async (session) => {
    const opts = session ? { session } : {};

    const creator = await User.findById(auth.user.id)
      .session(session || null)
      .lean();
    if (creator) await ensureUserAvatar(creator);

    const used = { letters: [], bgs: [] };
    const creatorAvatar = allocateMemberAvatar(
      auth.user.name,
      used,
      creator
    );
    used.letters.push(creatorAvatar.letters);
    used.bgs.push(creatorAvatar.bg);

    const embeddedMembers = [
      {
        userId: auth.user.id,
        email: auth.user.email,
        permission: "ADMIN",
        displayName: auth.user.name,
        avatar: creatorAvatar,
        joinedAt: new Date(),
        leftAt: null,
      },
    ];
    const invitations = [];

    for (const member of members) {
      const email = member.email || null;
      let linkedUser = null;
      if (email) {
        linkedUser = await User.findOne({ email })
          .session(session || null)
          .lean();
        if (linkedUser && String(linkedUser._id) === String(auth.user.id)) {
          continue;
        }
        if (linkedUser) await ensureUserAvatar(linkedUser);
      }

      const permission = member.invite ? member.permission || "ADD" : "ADD";
      const avatar = allocateMemberAvatar(member.name, used, linkedUser);
      used.letters.push(avatar.letters);
      used.bgs.push(avatar.bg);

      embeddedMembers.push({
        userId: linkedUser?._id ?? null,
        email,
        permission,
        displayName: member.name,
        avatar,
        joinedAt: new Date(),
        leftAt: null,
      });

      if (member.invite && email) {
        invitations.push({
          email,
          invitedById: auth.user.id,
          recipientId: linkedUser?._id ?? null,
          permission,
          status: "PENDING",
          tokenHash: hashToken(generateToken()),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          createdAt: new Date(),
          _notifyUserId: linkedUser?._id || null,
        });
      }
    }

    const [createdGroup] = await Group.create(
      [
        {
          name,
          description: description ?? null,
          icon: icon || "users",
          imageUrl: imageUrl ?? null,
          currency: currency || "INR",
          createdById: auth.user.id,
          settings: {
            defaultSplitMethod: defaultSplitMethod || "EQUAL",
            defaultSplitConfig: defaultSplitConfig ?? null,
          },
          members: embeddedMembers,
          invitations: invitations.map(({ _notifyUserId, ...inv }) => inv),
        },
      ],
      opts
    );

    for (const inv of invitations) {
      if (inv._notifyUserId) {
        await Notification.create(
          [
            {
              userId: inv._notifyUserId,
              type: "INVITATION",
              title: "Group invitation",
              body: `${auth.user.name} invited you to “${name}”`,
              data: { groupId: String(createdGroup._id) },
            },
          ],
          opts
        );
      }
    }

    await recordActivity({
      session,
      groupId: createdGroup._id,
      actorId: auth.user.id,
      action: "GROUP_CREATED",
      entityType: "group",
      entityId: createdGroup._id,
      metadata: {
        name,
        icon: icon || "users",
        currency: currency || "INR",
        memberCount: embeddedMembers.length,
      },
    });

    return createdGroup;
  });

  const json = toJSON(result);
  return created({
    group: {
      ...json,
      members: activeMembers(result).map((m) => serializeMember(m)),
      invitations: undefined,
    },
  });
}
