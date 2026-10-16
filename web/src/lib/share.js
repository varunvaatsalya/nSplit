import { randomBytes } from "node:crypto";

import { Expense, Group, Transfer } from "@/models";

/** 32-char url-safe token (192 bits): unguessable, so the link itself is the key. */
export function createShareToken() {
  return randomBytes(24).toString("base64url");
}

export const SHARE_TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/** Public link for a token. APP_URL wins (e.g. the production domain); else the request's origin. */
export function shareUrl(request, token) {
  const base = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  return `${base}/s/${token}`;
}

export function shareInfo(request, group) {
  const token = group?.share?.token;
  return token
    ? { token, url: shareUrl(request, token), createdAt: group.share.createdAt || null }
    : { token: null, url: null, createdAt: null };
}

/**
 * Everything a link viewer may see: names, avatars and the ledger.
 * Never emails, user ids, invitations or who created which record.
 */
export async function loadSharedLedger(token) {
  const group = await Group.findOne({ "share.token": token }).lean();
  if (!group) return null;

  const filter = { groupId: group._id, deletedAt: null };
  const [expenses, transfers] = await Promise.all([
    Expense.find(filter).sort({ expenseDate: -1, _id: -1 }).lean(),
    Transfer.find(filter).sort({ transferDate: -1, _id: -1 }).lean(),
  ]);
  const rows = (list) => (list || []).map((r) => ({ memberId: String(r.memberId), amountMinor: r.amountMinor }));

  return {
    group: {
      name: group.name,
      icon: group.icon ?? null,
      currency: group.currency || "INR",
      members: (group.members || [])
        .filter((m) => !m.leftAt)
        .map((m) => ({
          _id: String(m._id),
          displayName: m.displayName,
          avatar: { url: null, letters: m.avatar?.letters || null, bg: m.avatar?.bg || null },
          // Only whether someone joined as this name, never who.
          claimed: Boolean(m.userId),
        })),
    },
    expenses: expenses.map((e) => ({
      _id: String(e._id),
      title: e.title,
      description: e.description ?? null,
      amountMinor: e.amountMinor,
      currency: e.currency,
      icon: e.icon ?? null,
      categoryKey: e.categoryKey ?? null,
      splitMethod: e.splitMethod,
      expenseDate: e.expenseDate,
      createdAt: e.createdAt,
      payers: rows(e.payers),
      splits: (e.splits || []).map((s) => ({ ...rows([s])[0], inputValue: s.inputValue ?? null })),
    })),
    transfers: transfers.map((t) => ({
      _id: String(t._id),
      title: t.title,
      icon: t.icon ?? null,
      amountMinor: t.amountMinor,
      currency: t.currency,
      fromMemberId: String(t.fromMemberId),
      toMemberId: String(t.toMemberId),
      transferDate: t.transferDate,
      createdAt: t.createdAt,
    })),
  };
}
