import mongoose from "mongoose";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { Expense, Group, SavedShare, ShareRequest, Transfer, activeMembers } from "@/models";
import { matchCategory } from "@/shared/categories/index.js";
import { calculateSplit, validatePayers } from "@/shared/split/index.js";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const amountMinor = z.number().int().min(1).max(100_000_000_00);
const memberAmount = z.object({ memberId: objectId, amountMinor: z.number().int().min(0) });

/** Same shape the expense form saves: payers, participants and the split method. */
const expensePayload = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  amountMinor,
  splitMethod: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]),
  icon: z.string().trim().max(16).optional().nullable(),
  categoryKey: z.string().trim().max(32).optional().nullable(),
  expenseDate: z.string().datetime().optional(),
  payers: z.array(memberAmount).min(1).max(100),
  participants: z
    .array(
      z.object({
        memberId: objectId,
        included: z.boolean().optional(),
        inputValue: z.number().nullable().optional(),
      })
    )
    .min(1)
    .max(100),
});

const paymentPayload = z
  .object({
    title: z.string().trim().max(200).optional().nullable(),
    icon: z.string().trim().max(16).optional().nullable(),
    fromMemberId: objectId,
    toMemberId: objectId,
    amountMinor,
    transferDate: z.string().datetime().optional(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .refine((v) => v.fromMemberId !== v.toMemberId, { message: "Pick two different people" });

/** A member's suggestion (signed in; the group admin approves it). */
export const memberRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("expense"), expense: expensePayload }),
  z.object({ kind: z.literal("payment"), payment: paymentPayload }),
]);

export const joinRequestSchema = z.object({ memberId: objectId });

export const LIMITS = { pendingPerUser: 20, pendingJoinsPerGroup: 50 };

export class RequestError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

function activeIds(group) {
  return new Set(activeMembers(group).map((m) => String(m._id)));
}

function memberName(group, id) {
  return (group.members || []).find((m) => String(m._id) === String(id))?.displayName || "Member";
}

/** Normalized, validated payload (expense splits computed here, like a direct save). */
export function buildPayload(group, input) {
  const ids = activeIds(group);
  const need = (id) => {
    if (!ids.has(String(id))) throw new RequestError("Someone in this request is no longer in the group");
  };

  if (input.kind === "expense") {
    const e = input.expense;
    e.payers.forEach((p) => need(p.memberId));
    e.participants.forEach((p) => need(p.memberId));
    const payerCheck = validatePayers({ totalMinor: e.amountMinor, payers: e.payers });
    if (!payerCheck.valid) throw new RequestError(payerCheck.errors.join("; "));
    const included = e.participants.filter((p) => p.included !== false);
    const split = calculateSplit({
      method: e.splitMethod,
      totalMinor: e.amountMinor,
      participants: included.map((p) => ({ memberId: p.memberId, inputValue: p.inputValue ?? null })),
    });
    if (!split.valid) throw new RequestError(split.errors.join("; "));
    return {
      title: e.title,
      description: e.description || null,
      amountMinor: e.amountMinor,
      splitMethod: e.splitMethod,
      icon: e.icon || null,
      categoryKey: e.categoryKey || matchCategory(e.title).category.key,
      expenseDate: e.expenseDate || new Date().toISOString(),
      payers: e.payers,
      participants: e.participants.map((p) => ({
        memberId: p.memberId,
        included: p.included !== false,
        inputValue: p.inputValue ?? null,
      })),
      splits: split.splits,
    };
  }

  const p = input.payment;
  need(p.fromMemberId);
  need(p.toMemberId);
  return {
    title: p.title || null,
    icon: p.icon || null,
    fromMemberId: p.fromMemberId,
    toMemberId: p.toMemberId,
    amountMinor: p.amountMinor,
    transferDate: p.transferDate || null,
    note: p.note || null,
  };
}

export function serializeRequest(r) {
  return {
    _id: String(r._id),
    kind: r.kind,
    status: r.status,
    submittedByMemberId: String(r.submittedByMemberId),
    submitterName: r.submitterName,
    requesterName: r.requesterName || null,
    requesterEmail: r.requesterEmail || null,
    payload: r.payload,
    rejectReason: r.rejectReason || null,
    recordId: r.recordId ? String(r.recordId) : null,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt || null,
  };
}

export async function assertWithinLimits(groupId, userId) {
  const pending = await ShareRequest.countDocuments({ groupId, requesterUserId: userId, status: "PENDING" });
  if (pending >= LIMITS.pendingPerUser) {
    throw new RequestError("You already have many requests waiting. Wait for them to be reviewed.", 429);
  }
}

async function release(requestId) {
  await ShareRequest.updateOne(
    { _id: requestId },
    { $set: { status: "PENDING", reviewedById: null, reviewedAt: null, recordId: null } }
  );
}

/**
 * Approve: atomically claim the request (two admins can't both approve it), then
 * apply it. If applying fails, the claim is released.
 */
export async function approveRequest({ requestId, groupId, user }) {
  const group = await Group.findById(groupId).lean();
  const existing = await ShareRequest.findOne({ _id: requestId, groupId }).lean();
  if (!existing) throw new RequestError("Request not found", 404);
  if (existing.status !== "PENDING") throw new RequestError("This request was already reviewed", 409);
  if (existing.kind !== "join") {
    // Members may have left since it was sent.
    buildPayload(group, { kind: existing.kind, [existing.kind]: structuredClone(existing.payload) });
  }

  const recordId = existing.kind === "join" ? null : new mongoose.Types.ObjectId();
  const claimed = await ShareRequest.findOneAndUpdate(
    { _id: requestId, groupId, status: "PENDING" },
    { $set: { status: "APPROVED", reviewedById: user._id, reviewedAt: new Date(), recordId } },
    { new: true }
  ).lean();
  if (!claimed) throw new RequestError("This request was already reviewed", 409);

  try {
    if (claimed.kind === "join") await applyJoin(claimed, group, user);
    else if (claimed.kind === "expense") await applyExpense(claimed, group, user, recordId);
    else await applyPayment(claimed, group, user, recordId);
  } catch (error) {
    await release(requestId);
    throw error;
  }
  return claimed;
}

async function applyJoin(request, group, user) {
  const userId = request.requesterUserId;
  if (activeMembers(group).some((m) => m.userId && String(m.userId) === String(userId))) {
    throw new RequestError("This person is already in the group", 409);
  }
  // Link the account to the chosen name, only if nobody has claimed it meanwhile.
  const res = await Group.updateOne(
    { _id: group._id, members: { $elemMatch: { _id: request.submittedByMemberId, userId: null, leftAt: null } } },
    {
      $set: {
        "members.$.userId": userId,
        "members.$.email": request.requesterEmail || null,
        "members.$.permission": "VIEW_ONLY",
      },
    }
  );
  if (!res.modifiedCount) throw new RequestError("Someone already joined as this name", 409);

  // Close the other pending joins this approval settles.
  await ShareRequest.updateMany(
    {
      groupId: group._id,
      kind: "join",
      status: "PENDING",
      $or: [{ submittedByMemberId: request.submittedByMemberId }, { requesterUserId: userId }],
    },
    {
      $set: {
        status: "REJECTED",
        rejectReason: "Someone else joined as this name",
        reviewedById: user._id,
        reviewedAt: new Date(),
      },
    }
  );
  // It's a real group for them now, not a saved link.
  await SavedShare.deleteOne({ userId, groupId: group._id });
  await recordActivity({
    groupId: group._id,
    actorId: user._id,
    action: "MEMBER_ADDED",
    entityType: "member",
    entityId: request.submittedByMemberId,
    metadata: { name: request.submitterName, email: request.requesterEmail, source: "join-request" },
  });
}

async function applyExpense(request, group, user, recordId) {
  const p = request.payload;
  await Expense.create({
    _id: recordId,
    groupId: group._id,
    title: p.title,
    description: p.description || null,
    amountMinor: p.amountMinor,
    currency: group.currency || "INR",
    categoryKey: p.categoryKey || null,
    icon: p.icon || null,
    splitMethod: p.splitMethod,
    createdById: user._id,
    expenseDate: new Date(p.expenseDate),
    payers: p.payers,
    participants: p.participants,
    splits: p.splits,
  });
  await recordActivity({
    groupId: group._id,
    actorId: user._id,
    action: "EXPENSE_CREATED",
    entityType: "expense",
    entityId: recordId,
    metadata: { title: p.title, amountMinor: p.amountMinor, source: "request", requestedBy: request.submitterName },
  });
}

async function applyPayment(request, group, user, recordId) {
  const p = request.payload;
  const title = p.title || `${memberName(group, p.fromMemberId)} paid ${memberName(group, p.toMemberId)}`;
  await Transfer.create({
    _id: recordId,
    groupId: group._id,
    fromMemberId: p.fromMemberId,
    toMemberId: p.toMemberId,
    amountMinor: p.amountMinor,
    currency: group.currency || "INR",
    title,
    icon: p.icon || "💸",
    note: p.note || title,
    createdById: user._id,
    transferDate: p.transferDate ? new Date(p.transferDate) : request.createdAt,
  });
  await recordActivity({
    groupId: group._id,
    actorId: user._id,
    action: "TRANSFER_CREATED",
    entityType: "transfer",
    entityId: recordId,
    metadata: { title, amountMinor: p.amountMinor, source: "request", requestedBy: request.submitterName },
  });
}

export async function rejectRequest({ requestId, groupId, user, reason }) {
  const updated = await ShareRequest.findOneAndUpdate(
    { _id: requestId, groupId, status: "PENDING" },
    {
      $set: {
        status: "REJECTED",
        rejectReason: reason ? String(reason).trim().slice(0, 200) || null : null,
        reviewedById: user._id,
        reviewedAt: new Date(),
      },
    },
    { new: true }
  ).lean();
  if (!updated) throw new RequestError("This request was already reviewed", 409);
  return updated;
}
