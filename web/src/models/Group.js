import mongoose from "mongoose";
import {
  InvitationStatus,
  MemberPermission,
  SplitMethod,
  applyIdTransform,
} from "./_utils.js";

const { Schema, models, model } = mongoose;

const AvatarEmbedded = new Schema(
  {
    url: { type: String, default: null },
    letters: { type: String, default: null, uppercase: true, trim: true },
    bg: { type: String, default: null },
  },
  { _id: false }
);

const GroupMemberEmbedded = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, default: null, lowercase: true, trim: true },
    permission: { type: String, enum: MemberPermission, default: "ADD" },
    displayName: { type: String, required: true, trim: true },
    avatar: { type: AvatarEmbedded, default: () => ({}) },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
  },
  { timestamps: false }
);

const GroupInvitationEmbedded = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    invitedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    permission: { type: String, enum: MemberPermission, default: "ADD" },
    status: { type: String, enum: InvitationStatus, default: "PENDING" },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const GroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    icon: { type: String, default: "users" },
    imageUrl: { type: String, default: null },
    currency: { type: String, default: "INR" },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    version: { type: Number, default: 1 },
    settings: {
      defaultSplitMethod: { type: String, enum: SplitMethod, default: "EQUAL" },
      defaultSplitConfig: { type: Schema.Types.Mixed, default: null },
      simplifyDebts: { type: Boolean, default: false },
    },
    members: { type: [GroupMemberEmbedded], default: [] },
    invitations: { type: [GroupInvitationEmbedded], default: [] },
  },
  { timestamps: true }
);

GroupSchema.index({ "members.userId": 1 });
GroupSchema.index({ "members.email": 1 });

applyIdTransform(GroupSchema);

if (models.Group) {
  delete models.Group;
}

export const Group = model("Group", GroupSchema);

/** Active (non-left) members */
export function activeMembers(group) {
  return (group?.members || []).filter((m) => !m.leftAt);
}

export function findActiveMemberById(group, memberId) {
  return activeMembers(group).find((m) => String(m._id) === String(memberId));
}

export function findActiveMemberByUserId(group, userId) {
  return activeMembers(group).find(
    (m) => m.userId && String(m.userId) === String(userId)
  );
}

export function serializeMember(m, user = null) {
  const avatar =
    m.avatar?.letters && m.avatar?.bg
      ? {
          url: m.avatar.url ?? null,
          letters: m.avatar.letters,
          bg: m.avatar.bg,
        }
      : user?.avatar?.letters && user?.avatar?.bg
        ? {
            url: user.avatar.url ?? null,
            letters: user.avatar.letters,
            bg: user.avatar.bg,
          }
        : {
            url: user?.avatar?.url ?? user?.avatarUrl ?? null,
            letters: m.avatar?.letters || user?.avatar?.letters || null,
            bg:
              m.avatar?.bg ||
              m.avatarColor ||
              user?.avatar?.bg ||
              user?.avatarColor ||
              null,
          };

  return {
    id: String(m._id || m.id),
    userId: m.userId ? String(m.userId) : null,
    email: m.email || null,
    displayName: m.displayName,
    avatar,
    permission: m.permission,
    joinedAt: m.joinedAt,
    leftAt: m.leftAt || null,
    user: user
      ? {
          id: String(user._id || user.id),
          name: user.name,
          email: user.email,
          avatar: {
            url: user.avatar?.url ?? user.avatarUrl ?? null,
            letters: user.avatar?.letters ?? null,
            bg: user.avatar?.bg ?? user.avatarColor ?? null,
          },
        }
      : null,
  };
}
