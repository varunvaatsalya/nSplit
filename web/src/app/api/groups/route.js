import { connectDb, toJSON, withTransaction } from "@/lib/db";
import {
  Group,
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
import { createGroupCode } from "@/lib/group-id";
import {
  buildInvitation,
  memberInvitePayload,
  notifyInvitation,
} from "@/lib/invitations";
import { compareMembersByName } from "@/lib/members";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await connectDb();
  const groups = await Group.find({
    members: { $elemMatch: { userId: auth.user._id, leftAt: null } },
  })
    .sort({ updatedAt: -1 })
    .lean();

  return ok({
    groups: groups.map((g) => {
      const mine = activeMembers(g).find(
        (m) => m.userId && String(m.userId) === String(auth.user._id)
      );
      return {
        ...toJSON(g),
        memberCount: activeMembers(g).length,
        myPermission: mine?.permission || null,
        myMembershipId: mine ? String(mine._id) : null,
        members: undefined,
        invitations: undefined,
        settings: undefined,
        createdById: undefined,
        createdAt: undefined,
        updatedAt: undefined,
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

    const creator = await User.findById(auth.user._id)
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
        userId: auth.user._id,
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
        if (linkedUser && String(linkedUser._id) === String(auth.user._id)) {
          continue;
        }
        if (linkedUser) await ensureUserAvatar(linkedUser);
      }

      const permission = member.invite ? member.permission || "ADD" : "ADD";
      const avatar = allocateMemberAvatar(member.name, used, linkedUser);
      used.letters.push(avatar.letters);
      used.bgs.push(avatar.bg);

      embeddedMembers.push({
        userId: member.invite ? null : linkedUser?._id ?? null,
        email,
        permission,
        displayName: member.name,
        avatar,
        joinedAt: new Date(),
        leftAt: null,
      });

      if (member.invite && email) {
        invitations.push({
          ...buildInvitation({
            email,
            invitedById: auth.user._id,
            recipientId: linkedUser?._id ?? null,
            permission,
          }),
          _notifyUserId: linkedUser?._id || null,
        });
      }
    }

    embeddedMembers.sort(compareMembersByName);

    let createdGroup;
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        [createdGroup] = await Group.create(
          [
            {
              code: createGroupCode(),
              name,
              description: description ?? null,
              icon: icon || "users",
              imageUrl: imageUrl ?? null,
              currency: currency || "INR",
              createdById: auth.user._id,
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
        break;
      } catch (e) {
        if (e?.code === 11000 && attempt < 7) continue;
        throw e;
      }
    }

    if (!createdGroup) throw new Error("Could not create group");

    for (const savedInv of createdGroup.invitations || []) {
      const source = invitations.find((inv) => inv.email === savedInv.email);
      await recordActivity({
        session,
        groupId: createdGroup._id,
        actorId: auth.user._id,
        action: "INVITATION_SENT",
        entityType: "invitation",
        entityId: savedInv._id,
        metadata: { email: savedInv.email },
      });
      if (!source?._notifyUserId) continue;
      await notifyInvitation({
        userId: source._notifyUserId,
        invitedByName: auth.user.name,
        group: createdGroup,
        invitation: savedInv,
        status: "PENDING",
        session,
      });
    }

    await recordActivity({
      session,
      groupId: createdGroup._id,
      actorId: auth.user._id,
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
      members: activeMembers(result).map((m) => ({
        ...serializeMember(m),
        invite: memberInvitePayload(result, m),
      })),
      invitations: undefined,
    },
  });
}
