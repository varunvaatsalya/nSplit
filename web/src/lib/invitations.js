import mongoose from "mongoose";
import { Group, Notification, User, activeMembers } from "@/models";
import { recordActivity } from "@/lib/activity";
import { generateToken, hashToken } from "@/lib/auth/tokens";

export const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function isInvitationExpired(inv, now = Date.now()) {
  if (!inv?.expiresAt) return false;
  return new Date(inv.expiresAt).getTime() < now;
}

export function invitationObjectId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) return null;
  return new mongoose.Types.ObjectId(String(id));
}

export function buildInvitation({
  email,
  invitedById,
  recipientId = null,
  permission = "ADD",
}) {
  return {
    email: normalizeEmail(email),
    invitedById,
    recipientId: recipientId || null,
    permission: permission || "ADD",
    status: "PENDING",
    tokenHash: hashToken(generateToken()),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    createdAt: new Date(),
  };
}

export function expireStaleInvitations(group, now = new Date()) {
  let dirty = false;
  for (const inv of group.invitations || []) {
    if (inv.status === "PENDING" && isInvitationExpired(inv, now)) {
      inv.status = "EXPIRED";
      dirty = true;
    }
  }
  return dirty;
}

export function revokePendingInvitesForEmail(group, email) {
  const e = normalizeEmail(email);
  let dirty = false;
  for (const inv of group.invitations || []) {
    if (inv.email === e && inv.status === "PENDING") {
      inv.status = "REVOKED";
      dirty = true;
    }
  }
  return dirty;
}

export function latestInvitationForEmail(group, email) {
  const e = normalizeEmail(email);
  if (!e) return null;
  const list = (group.invitations || []).filter((inv) => inv.email === e);
  if (!list.length) return null;
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

export function memberInvitePayload(group, member) {
  const inv = latestInvitationForEmail(group, member?.email);
  if (!inv) return null;
  const status =
    inv.status === "PENDING" && isInvitationExpired(inv)
      ? "EXPIRED"
      : inv.status;
  return {
    _id: String(inv._id),
    status,
    expiresAt: inv.expiresAt,
  };
}

export function serializeInvitation(inv, group) {
  const status =
    inv.status === "PENDING" && isInvitationExpired(inv)
      ? "EXPIRED"
      : inv.status;
  return {
    _id: String(inv._id),
    groupId: String(group._id),
    groupCode: group.code,
    groupName: group.name,
    groupIcon: group.icon || null,
    email: inv.email,
    permission: inv.permission,
    status,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
  };
}

export async function notifyInvitation({
  userId,
  invitedByName,
  group,
  invitation,
  status = "PENDING",
  session = null,
}) {
  if (!userId) return null;
  const pending = status === "PENDING";
  const expired = status === "EXPIRED";
  const docs = [
    {
      userId,
      type: "INVITATION",
      title: expired ? "Invitation expired" : "Group invitation",
      body: pending
        ? `${invitedByName} invited you to “${group.name}”`
        : expired
          ? `The invite to “${group.name}” expired. Ask a group admin to send a new one.`
          : `${invitedByName} invited you to “${group.name}”`,
      data: {
        groupId: String(group._id),
        groupCode: group.code,
        groupName: group.name,
        invitationId: String(invitation._id),
        status,
      },
    },
  ];
  const opts = session ? { session } : undefined;
  const created = opts
    ? await Notification.create(docs, opts)
    : await Notification.create(docs);
  return Array.isArray(created) ? created[0] : created;
}

async function invitationNotificationExists(userId, invitationId, session) {
  return Notification.findOne({
    userId,
    type: "INVITATION",
    "data.invitationId": String(invitationId),
  })
    .session(session || null)
    .select("_id")
    .lean();
}

/**
 * Attach recipientId, expire stale invites, and notify the user.
 * Safe to call on register and login (idempotent).
 */
export async function syncInvitationsForUser(user, { session } = {}) {
  const email = normalizeEmail(user?.email);
  if (!email) return { pending: 0, expired: 0 };

  const groups = await Group.find({ "invitations.email": email }).session(
    session || null
  );

  let pending = 0;
  let expired = 0;
  const invitedByIds = [
    ...new Set(
      groups.flatMap((g) =>
        (g.invitations || [])
          .filter((inv) => inv.email === email && inv.invitedById)
          .map((inv) => String(inv.invitedById))
      )
    ),
  ];
  const inviters = invitedByIds.length
    ? await User.find({ _id: { $in: invitedByIds } })
        .select("name")
        .session(session || null)
        .lean()
    : [];
  const inviterMap = new Map(inviters.map((u) => [String(u._id), u.name]));

  for (const group of groups) {
    let dirty = expireStaleInvitations(group);
    for (const inv of group.invitations || []) {
      if (inv.email !== email) continue;
      if (inv.status !== "PENDING" && inv.status !== "EXPIRED") continue;

      if (!inv.recipientId) {
        inv.recipientId = user._id;
        dirty = true;
      } else if (String(inv.recipientId) !== String(user._id)) {
        continue;
      }

      const already = await invitationNotificationExists(
        user._id,
        inv._id,
        session
      );
      if (already) continue;

      const invitedByName =
        inviterMap.get(String(inv.invitedById)) || "Someone";
      await notifyInvitation({
        userId: user._id,
        invitedByName,
        group,
        invitation: inv,
        status: inv.status,
        session,
      });
      if (inv.status === "PENDING") pending += 1;
      else expired += 1;
    }
    if (dirty) await group.save(session ? { session } : undefined);
  }

  return { pending, expired };
}

export async function listInvitationsForUser(user) {
  const email = normalizeEmail(user?.email);
  if (!email) return [];

  const groups = await Group.find({
    $or: [
      { "invitations.email": email },
      { "invitations.recipientId": user._id },
    ],
  }).lean();

  const rows = [];
  for (const group of groups) {
    for (const inv of group.invitations || []) {
      const mine =
        inv.email === email ||
        (inv.recipientId && String(inv.recipientId) === String(user._id));
      if (!mine) continue;
      if (
        !["PENDING", "EXPIRED", "ACCEPTED", "DECLINED", "REVOKED"].includes(
          inv.status
        )
      ) {
        continue;
      }
      rows.push(serializeInvitation(inv, group));
    }
  }

  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function invitationAccessError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function loadInvitationForUser(user, invitationId) {
  const oid = invitationObjectId(invitationId);
  if (!oid) {
    throw invitationAccessError("Invitation not found", 404, "NOT_FOUND");
  }

  const group = await Group.findOne({ "invitations._id": oid });
  if (!group) {
    throw invitationAccessError("Invitation not found", 404, "NOT_FOUND");
  }

  expireStaleInvitations(group);
  const inv = group.invitations.id(String(invitationId));
  if (!inv) {
    throw invitationAccessError("Invitation not found", 404, "NOT_FOUND");
  }

  const email = normalizeEmail(user.email);
  const allowed =
    (inv.recipientId && String(inv.recipientId) === String(user._id)) ||
    inv.email === email;
  if (!allowed) {
    throw invitationAccessError("Invitation not found", 404, "NOT_FOUND");
  }

  return { group, inv };
}

async function markInvitationNotifications(userId, invitationId, status) {
  await Notification.updateMany(
    {
      userId,
      type: "INVITATION",
      "data.invitationId": String(invitationId),
    },
    {
      $set: {
        readAt: new Date(),
        "data.status": status,
      },
    }
  );
}

export async function acceptInvitation(user, invitationId) {
  const { group, inv } = await loadInvitationForUser(user, invitationId);
  const email = normalizeEmail(user.email);

  if (inv.status === "ACCEPTED") {
    return {
      already: true,
      group,
      invitation: serializeInvitation(inv, group),
    };
  }

  if (inv.status === "EXPIRED" || isInvitationExpired(inv)) {
    inv.status = "EXPIRED";
    await group.save();
    throw invitationAccessError(
      "This invitation has expired. Ask a group admin to send a new one.",
      410,
      "INVITE_EXPIRED"
    );
  }

  if (inv.status !== "PENDING") {
    throw invitationAccessError(
      "This invitation is no longer active",
      409,
      "INVITE_INACTIVE"
    );
  }

  const linked = activeMembers(group).find(
    (m) => m.userId && String(m.userId) === String(user._id)
  );
  const member =
    linked ||
    activeMembers(group).find((m) => normalizeEmail(m.email) === email);

  if (!member) {
    throw invitationAccessError(
      "This invitation is no longer valid",
      409,
      "INVITE_INACTIVE"
    );
  }

  if (member.userId && String(member.userId) !== String(user._id)) {
    throw invitationAccessError(
      "This member is already linked to another account",
      409,
      "ALREADY_MEMBER"
    );
  }

  member.userId = user._id;
  member.email = email || member.email;
  if (inv.permission) member.permission = inv.permission;
  inv.status = "ACCEPTED";
  inv.recipientId = user._id;
  await group.save();

  await recordActivity({
    groupId: group._id,
    actorId: user._id,
    action: "INVITATION_ACCEPTED",
    entityType: "invitation",
    entityId: inv._id,
    metadata: {
      email,
      memberId: String(member._id),
    },
  });

  await markInvitationNotifications(user._id, inv._id, "ACCEPTED");

  return {
    already: false,
    group,
    invitation: serializeInvitation(inv, group),
  };
}

export async function declineInvitation(user, invitationId) {
  const { group, inv } = await loadInvitationForUser(user, invitationId);

  if (inv.status === "DECLINED") {
    return {
      already: true,
      invitation: serializeInvitation(inv, group),
    };
  }

  if (inv.status === "EXPIRED" || isInvitationExpired(inv)) {
    inv.status = "EXPIRED";
    await group.save();
    throw invitationAccessError(
      "This invitation has expired",
      410,
      "INVITE_EXPIRED"
    );
  }

  if (inv.status !== "PENDING") {
    throw invitationAccessError(
      "This invitation is no longer active",
      409,
      "INVITE_INACTIVE"
    );
  }

  inv.status = "DECLINED";
  inv.recipientId = user._id;
  await group.save();
  await markInvitationNotifications(user._id, inv._id, "DECLINED");

  return {
    already: false,
    invitation: serializeInvitation(inv, group),
  };
}

export async function resendMemberInvite({
  group,
  member,
  invitedBy,
}) {
  const email = normalizeEmail(member.email);
  if (!email) {
    throw invitationAccessError(
      "This member needs an email before you can invite them",
      422,
      "EMAIL_REQUIRED"
    );
  }
  if (member.userId) {
    throw invitationAccessError(
      "This member already has access",
      409,
      "ALREADY_MEMBER"
    );
  }

  expireStaleInvitations(group);
  revokePendingInvitesForEmail(group, email);

  const linkedUser = await User.findOne({ email }).select("_id name email").lean();
  const invitation = buildInvitation({
    email,
    invitedById: invitedBy._id,
    recipientId: linkedUser?._id ?? null,
    permission: member.permission || "ADD",
  });
  group.invitations.push(invitation);
  await group.save();
  const saved = latestInvitationForEmail(group, email);

  await recordActivity({
    groupId: group._id,
    actorId: invitedBy._id,
    action: "INVITATION_SENT",
    entityType: "invitation",
    entityId: saved?._id,
    metadata: { email, memberId: String(member._id) },
  });

  if (linkedUser) {
    await notifyInvitation({
      userId: linkedUser._id,
      invitedByName: invitedBy.name || "Someone",
      group,
      invitation: saved,
      status: "PENDING",
    });
  }

  return {
    invitation: serializeInvitation(saved, group),
    notified: Boolean(linkedUser),
  };
}
