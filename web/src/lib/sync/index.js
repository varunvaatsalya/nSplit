/**
 * Mobile ↔ server sync.
 *
 * Push: the app sends full snapshots of changed records (group with its members,
 * expense, transfer), keyed by ids the device generated in ObjectId format, so the
 * same id is used everywhere and nothing needs mapping. Conflicts resolve
 * last-write-wins on `clientUpdatedAt`.
 *
 * Pull: everything in the user's groups changed since the client's cursor, plus the
 * full contents of groups the client does not know yet, plus the ids of groups the
 * client knows but can no longer see (deleted, or the user was removed).
 */
import mongoose from "mongoose";

import { recordActivity } from "@/lib/activity";
import { createGroupCode } from "@/lib/group-id";
import { Expense, Group, Transfer, findActiveMemberByUserId } from "@/models";
import { Actions, can, canMutateCreatedRecord } from "@/shared/permissions/index.js";
import { validatePayers } from "@/shared/split/index.js";
import { isValidUpiId, normalizeUpiId } from "@/shared/upi/index.js";

export const OBJECT_ID = /^[a-f0-9]{24}$/i;

export class SyncError extends Error {
  constructor(message, status = "REJECTED") {
    super(message);
    this.status = status;
  }
}

function forbidden(message) {
  return new SyncError(message, "REJECTED");
}

function toDate(value, fallback = null) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function str(value) {
  return value == null ? null : String(value);
}

/** Incoming change is older than what the server already holds. */
function isStale(existing, clientUpdatedAt) {
  const current = existing?.clientUpdatedAt || existing?.updatedAt;
  return Boolean(current && clientUpdatedAt && clientUpdatedAt < new Date(current));
}

function membershipOf(group, userId) {
  const me = findActiveMemberByUserId(group, userId);
  if (!me) throw forbidden("Not a member of this group");
  return me;
}

/* ------------------------------------------------------------------ serialize */

export function serializeGroup(group) {
  return {
    id: String(group._id),
    code: group.code,
    name: group.name,
    description: group.description ?? null,
    icon: group.icon ?? null,
    currency: group.currency || "INR",
    createdById: str(group.createdById),
    settings: {
      defaultSplitMethod: group.settings?.defaultSplitMethod || "EQUAL",
      defaultSplitConfig: group.settings?.defaultSplitConfig ?? null,
      simplifyDebts: Boolean(group.settings?.simplifyDebts),
    },
    members: (group.members || []).map((m) => ({
      id: String(m._id),
      displayName: m.displayName,
      userId: str(m.userId),
      email: m.email || null,
      permission: m.permission || "ADD",
      avatar: { letters: m.avatar?.letters || null, bg: m.avatar?.bg || null },
      upiId: m.upiId || null,
      leftAt: m.leftAt || null,
    })),
    clientUpdatedAt: group.clientUpdatedAt || group.updatedAt || null,
    updatedAt: group.updatedAt || null,
  };
}

function memberRows(rows) {
  return (rows || []).map((r) => ({ ...r, memberId: String(r.memberId) }));
}

export function serializeExpense(e) {
  return {
    id: String(e._id),
    groupId: String(e.groupId),
    title: e.title,
    description: e.description ?? null,
    amountMinor: e.amountMinor,
    currency: e.currency,
    icon: e.icon ?? null,
    categoryKey: e.categoryKey ?? null,
    splitMethod: e.splitMethod,
    expenseDate: e.expenseDate || null,
    createdAt: e.createdAt || null,
    deletedAt: e.deletedAt || null,
    createdById: str(e.createdById),
    version: e.version || 1,
    payers: memberRows(e.payers),
    participants: memberRows(e.participants),
    splits: memberRows(e.splits),
    clientUpdatedAt: e.clientUpdatedAt || e.updatedAt || null,
  };
}

export function serializeTransfer(t) {
  return {
    id: String(t._id),
    groupId: String(t.groupId),
    title: t.title ?? null,
    icon: t.icon ?? null,
    note: t.note ?? null,
    amountMinor: t.amountMinor,
    currency: t.currency,
    fromMemberId: String(t.fromMemberId),
    toMemberId: String(t.toMemberId),
    transferDate: t.transferDate || null,
    createdAt: t.createdAt || null,
    deletedAt: t.deletedAt || null,
    createdById: str(t.createdById),
    clientUpdatedAt: t.clientUpdatedAt || t.updatedAt || null,
  };
}

/* ---------------------------------------------------------------------- group */

function incomingMember(m) {
  if (!OBJECT_ID.test(String(m?.id || ""))) throw new SyncError("Invalid member id");
  const displayName = String(m.displayName || "").trim();
  if (!displayName) throw new SyncError("Member name required");
  return {
    _id: new mongoose.Types.ObjectId(m.id),
    displayName,
    avatar: {
      letters: m.avatar?.letters ? String(m.avatar.letters).slice(0, 3) : null,
      bg: m.avatar?.bg || null,
    },
    leftAt: toDate(m.leftAt),
    // Invalid ids are dropped rather than failing the whole group.
    upiId: isValidUpiId(m.upiId) ? normalizeUpiId(m.upiId) : null,
  };
}

function incomingSettings(settings) {
  const method = String(settings?.defaultSplitMethod || "EQUAL").toUpperCase();
  return {
    defaultSplitMethod: ["EQUAL", "EXACT", "PERCENTAGE", "SHARES", "CUSTOM"].includes(method)
      ? method
      : "EQUAL",
    defaultSplitConfig: Array.isArray(settings?.defaultSplitConfig)
      ? settings.defaultSplitConfig
      : null,
    simplifyDebts: Boolean(settings?.simplifyDebts),
  };
}

async function applyGroup({ change, user, clientUpdatedAt }) {
  const existing = await Group.findById(change.id);

  if (change.op === "delete") {
    if (!existing) return { status: "APPLIED" };
    if (String(existing.createdById) !== String(user._id)) {
      throw forbidden("Only the group creator can delete the group");
    }
    await Group.deleteOne({ _id: existing._id });
    return { status: "APPLIED" };
  }

  const data = change.data || {};
  const name = String(data.name || "").trim();
  if (!name) throw new SyncError("Group name required");
  const members = (data.members || []).map(incomingMember);

  if (!existing) {
    let code = String(data.code || "").toUpperCase();
    if (!code || (await Group.exists({ code }))) code = createGroupCode();

    // The pushing user must be a member, or the group would be invisible to them.
    const mine = members.find((m) => String(m._id) === String(data.myMemberId) && !m.leftAt);
    const rows = members.map((m) => ({
      ...m,
      userId: mine && m === mine ? user._id : null,
      email: mine && m === mine ? user.email : null,
      permission: mine && m === mine ? "ADMIN" : "ADD",
    }));
    if (!mine) {
      rows.push({
        displayName: user.name || "You",
        userId: user._id,
        email: user.email,
        permission: "ADMIN",
      });
    }

    const group = await Group.create({
      _id: change.id,
      code,
      name,
      description: String(data.description || "").trim().slice(0, 2000) || null,
      icon: data.icon || null,
      currency: data.currency || "INR",
      createdById: user._id,
      settings: incomingSettings(data.settings),
      members: rows,
      clientUpdatedAt,
    });
    await recordActivity({
      groupId: group._id,
      actorId: user._id,
      action: "GROUP_CREATED",
      entityType: "group",
      entityId: group._id,
      metadata: { name, source: "sync" },
    });
    return { status: "APPLIED" };
  }

  const me = membershipOf(existing, user._id);
  if (!can(me.permission, Actions.MANAGE_SETTINGS)) {
    throw forbidden("You cannot change this group's settings or members");
  }
  if (isStale(existing, clientUpdatedAt)) return { status: "STALE" };

  existing.name = name;
  // Older app versions don't send a description: leave the server's copy alone.
  if (Object.prototype.hasOwnProperty.call(data, "description")) {
    existing.description = String(data.description || "").trim().slice(0, 2000) || null;
  }
  existing.icon = data.icon ?? existing.icon;
  existing.currency = data.currency || existing.currency;
  existing.settings = incomingSettings(data.settings);

  // Merge members by id. Server-owned fields (userId, email, permission) are kept.
  for (const incoming of members) {
    const current = existing.members.id(incoming._id);
    if (current) {
      current.displayName = incoming.displayName;
      current.avatar = { ...(current.avatar?.toObject?.() || {}), ...incoming.avatar };
      current.leftAt = incoming.leftAt;
      current.upiId = incoming.upiId;
    } else {
      existing.members.push({ ...incoming, permission: "ADD" });
    }
  }
  existing.clientUpdatedAt = clientUpdatedAt;
  await existing.save();
  await recordActivity({
    groupId: existing._id,
    actorId: user._id,
    action: "GROUP_UPDATED",
    entityType: "group",
    entityId: existing._id,
    metadata: { name, source: "sync" },
  });
  return { status: "APPLIED" };
}

/* ---------------------------------------------------------- expense / transfer */

async function loadGroupFor(change) {
  if (!OBJECT_ID.test(String(change.groupId || ""))) throw new SyncError("Invalid group id");
  const group = await Group.findById(change.groupId).lean();
  if (!group) throw new SyncError("Group not found");
  return group;
}

function assertMembers(group, ids) {
  const known = new Set((group.members || []).map((m) => String(m._id)));
  for (const id of ids) {
    if (!known.has(String(id))) throw new SyncError(`Unknown member ${id}`);
  }
}

function assertCanChange(me, record, user) {
  if (!canMutateCreatedRecord(me.permission, record.createdById, user._id)) {
    throw forbidden("Only the creator or a group admin can change this record");
  }
}

async function applyExpense({ change, user, clientUpdatedAt }) {
  const group = await loadGroupFor(change);
  const me = membershipOf(group, user._id);
  const existing = await Expense.findById(change.id);
  if (existing && String(existing.groupId) !== String(group._id)) {
    throw new SyncError("Expense belongs to another group");
  }

  if (change.op === "delete") {
    if (!existing || existing.deletedAt) return { status: "APPLIED" };
    assertCanChange(me, existing, user);
    if (isStale(existing, clientUpdatedAt)) return { status: "STALE" };
    existing.deletedAt = toDate(change.data?.deletedAt, new Date());
    existing.version = (existing.version || 1) + 1;
    existing.clientUpdatedAt = clientUpdatedAt;
    await existing.save();
    await recordActivity({
      groupId: group._id,
      actorId: user._id,
      action: "EXPENSE_DELETED",
      entityType: "expense",
      entityId: existing._id,
      metadata: { title: existing.title, amountMinor: existing.amountMinor },
    });
    return { status: "APPLIED" };
  }

  const d = change.data || {};
  const amountMinor = Number(d.amountMinor);
  if (!Number.isInteger(amountMinor) || amountMinor < 0) throw new SyncError("Invalid amount");
  const payers = (d.payers || []).map((p) => ({
    memberId: String(p.memberId),
    amountMinor: Number(p.amountMinor),
  }));
  const splits = (d.splits || []).map((s) => ({
    memberId: String(s.memberId),
    amountMinor: Number(s.amountMinor),
    inputValue: s.inputValue ?? null,
  }));
  const participants = (d.participants || []).map((p) => ({
    memberId: String(p.memberId),
    included: p.included !== false,
    inputValue: p.inputValue ?? null,
  }));
  const payerCheck = validatePayers({ totalMinor: amountMinor, payers });
  if (!payerCheck.valid) throw new SyncError(payerCheck.errors.join("; "));
  const splitSum = splits.reduce((sum, s) => sum + (Number.isInteger(s.amountMinor) ? s.amountMinor : NaN), 0);
  if (splitSum !== amountMinor) throw new SyncError("Splits must add up to the amount");
  assertMembers(group, [...payers, ...splits, ...participants].map((r) => r.memberId));

  const fields = {
    title: String(d.title || "").trim() || "Expense",
    description: d.description ?? null,
    amountMinor,
    currency: group.currency || "INR",
    categoryKey: d.categoryKey ?? null,
    icon: d.icon ?? null,
    splitMethod: d.splitMethod || "EQUAL",
    expenseDate: toDate(d.expenseDate, new Date()),
    deletedAt: toDate(d.deletedAt),
    payers,
    participants,
    splits,
    clientUpdatedAt,
  };

  if (!existing) {
    if (!can(me.permission, Actions.ADD_EXPENSE)) throw forbidden("You cannot add expenses");
    const expense = await Expense.create({
      _id: change.id,
      groupId: group._id,
      createdById: user._id,
      version: 1,
      ...fields,
    });
    await recordActivity({
      groupId: group._id,
      actorId: user._id,
      action: "EXPENSE_CREATED",
      entityType: "expense",
      entityId: expense._id,
      metadata: { title: fields.title, amountMinor },
    });
    return { status: "APPLIED" };
  }

  assertCanChange(me, existing, user);
  if (isStale(existing, clientUpdatedAt)) return { status: "STALE" };
  existing.set({ ...fields, version: (existing.version || 1) + 1 });
  await existing.save();
  await recordActivity({
    groupId: group._id,
    actorId: user._id,
    action: "EXPENSE_UPDATED",
    entityType: "expense",
    entityId: existing._id,
    metadata: { title: fields.title, amountMinor },
  });
  return { status: "APPLIED" };
}

async function applyTransfer({ change, user, clientUpdatedAt }) {
  const group = await loadGroupFor(change);
  const me = membershipOf(group, user._id);
  const existing = await Transfer.findById(change.id);
  if (existing && String(existing.groupId) !== String(group._id)) {
    throw new SyncError("Transfer belongs to another group");
  }

  if (change.op === "delete") {
    if (!existing || existing.deletedAt) return { status: "APPLIED" };
    assertCanChange(me, existing, user);
    if (isStale(existing, clientUpdatedAt)) return { status: "STALE" };
    existing.deletedAt = toDate(change.data?.deletedAt, new Date());
    existing.version = (existing.version || 1) + 1;
    existing.clientUpdatedAt = clientUpdatedAt;
    await existing.save();
    await recordActivity({
      groupId: group._id,
      actorId: user._id,
      action: "TRANSFER_DELETED",
      entityType: "transfer",
      entityId: existing._id,
      metadata: { amountMinor: existing.amountMinor },
    });
    return { status: "APPLIED" };
  }

  const d = change.data || {};
  const amountMinor = Number(d.amountMinor);
  if (!Number.isInteger(amountMinor) || amountMinor < 1) throw new SyncError("Invalid amount");
  const fromMemberId = String(d.fromMemberId || "");
  const toMemberId = String(d.toMemberId || "");
  if (!fromMemberId || fromMemberId === toMemberId) throw new SyncError("Pick two different members");
  assertMembers(group, [fromMemberId, toMemberId]);

  const fields = {
    title: d.title ?? null,
    icon: d.icon ?? null,
    note: d.note ?? null,
    amountMinor,
    currency: group.currency || "INR",
    fromMemberId,
    toMemberId,
    transferDate: toDate(d.transferDate, new Date()),
    deletedAt: toDate(d.deletedAt),
    clientUpdatedAt,
  };

  if (!existing) {
    if (!can(me.permission, Actions.ADD_TRANSFER)) throw forbidden("You cannot add payments");
    const transfer = await Transfer.create({
      _id: change.id,
      groupId: group._id,
      createdById: user._id,
      version: 1,
      ...fields,
    });
    await recordActivity({
      groupId: group._id,
      actorId: user._id,
      action: "TRANSFER_CREATED",
      entityType: "transfer",
      entityId: transfer._id,
      metadata: { amountMinor },
    });
    return { status: "APPLIED" };
  }

  assertCanChange(me, existing, user);
  if (isStale(existing, clientUpdatedAt)) return { status: "STALE" };
  existing.set({ ...fields, version: (existing.version || 1) + 1 });
  await existing.save();
  await recordActivity({
    groupId: group._id,
    actorId: user._id,
    action: "TRANSFER_UPDATED",
    entityType: "transfer",
    entityId: existing._id,
    metadata: { amountMinor },
  });
  return { status: "APPLIED" };
}

const APPLIERS = { group: applyGroup, expense: applyExpense, transfer: applyTransfer };

export async function applyChange({ change, user }) {
  const apply = APPLIERS[change.entity];
  if (!apply) throw new SyncError(`Unknown entity ${change.entity}`);
  const clientUpdatedAt = toDate(change.clientUpdatedAt, new Date());
  return apply({ change, user, clientUpdatedAt });
}

/** Current server copy of one record, sent back when a push was stale or rejected. */
export async function serverCopy(change) {
  if (change.entity === "group") {
    const g = await Group.findById(change.id).lean();
    return g ? { groups: [serializeGroup(g)] } : null;
  }
  if (change.entity === "expense") {
    const e = await Expense.findById(change.id).lean();
    return e ? { expenses: [serializeExpense(e)] } : null;
  }
  if (change.entity === "transfer") {
    const t = await Transfer.findById(change.id).lean();
    return t ? { transfers: [serializeTransfer(t)] } : null;
  }
  return null;
}

/* ----------------------------------------------------------------------- pull */

export async function pullChanges({ user, since, knownGroupIds = [] }) {
  const sinceDate = toDate(since);
  const groups = await Group.find({
    members: { $elemMatch: { userId: user._id, leftAt: null } },
  }).lean();

  const visible = new Set(groups.map((g) => String(g._id)));
  const known = new Set(knownGroupIds.map(String));
  const removedGroupIds = [...known].filter((id) => !visible.has(id));
  const freshIds = [...visible].filter((id) => !sinceDate || !known.has(id));
  const visibleIds = [...visible];

  const recordFilter = sinceDate
    ? {
        groupId: { $in: visibleIds },
        $or: [{ updatedAt: { $gte: sinceDate } }, { groupId: { $in: freshIds } }],
      }
    : { groupId: { $in: visibleIds } };

  const [expenses, transfers] = visibleIds.length
    ? await Promise.all([Expense.find(recordFilter).lean(), Transfer.find(recordFilter).lean()])
    : [[], []];

  const fresh = new Set(freshIds);
  return {
    groups: groups
      .filter((g) => fresh.has(String(g._id)) || !sinceDate || g.updatedAt >= sinceDate)
      .map(serializeGroup),
    expenses: expenses.map(serializeExpense),
    transfers: transfers.map(serializeTransfer),
    removedGroupIds,
  };
}
