import { Group, SavedShare, ShareRequest, activeMembers } from "@/models";

import { SHARE_TOKEN } from "@/lib/share";

/** Token from a pasted share link ("https://…/s/<token>") or a bare token. */
export function tokenFromInput(input) {
  const text = String(input || "").trim();
  const match = text.match(/\/s\/([A-Za-z0-9_-]{20,64})(?:[/?#]|$)/);
  const token = match ? match[1] : text;
  return SHARE_TOKEN.test(token) ? token : null;
}

/**
 * The user's saved (view-only) groups. A saved link whose group link was turned
 * off or replaced comes back as `expired` with no group data. Groups the user has
 * since joined are dropped: they show up as normal groups.
 */
export async function listSavedShares(user) {
  const saved = await SavedShare.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
  if (!saved.length) return [];

  const groups = await Group.find({ _id: { $in: saved.map((s) => s.groupId) } }).lean();
  const byId = new Map(groups.map((g) => [String(g._id), g]));
  const joins = await ShareRequest.find({
    requesterUserId: user._id,
    kind: "join",
    groupId: { $in: saved.map((s) => s.groupId) },
  })
    .sort({ createdAt: -1 })
    .lean();
  const lastJoin = new Map();
  for (const j of joins) if (!lastJoin.has(String(j.groupId))) lastJoin.set(String(j.groupId), j);

  const joined = [];
  const items = [];
  for (const s of saved) {
    const group = byId.get(String(s.groupId));
    const isMember =
      group && activeMembers(group).some((m) => m.userId && String(m.userId) === String(user._id));
    if (isMember) {
      joined.push(s._id);
      continue;
    }
    const active = Boolean(group && group.share?.token === s.token);
    const join = lastJoin.get(String(s.groupId));
    items.push({
      token: s.token,
      status: active ? "active" : "expired",
      name: active ? group.name : s.groupName,
      icon: active ? group.icon ?? null : s.groupIcon,
      memberCount: active ? activeMembers(group).length : null,
      join: !active ? "none" : !join ? "none" : join.status === "PENDING" ? "pending" : join.status === "REJECTED" ? "rejected" : "none",
      savedAt: s.createdAt,
    });
  }
  if (joined.length) await SavedShare.deleteMany({ _id: { $in: joined } });
  return items;
}
