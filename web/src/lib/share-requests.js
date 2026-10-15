import mongoose from "mongoose";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { Expense, Group, ShareRequest, Transfer, activeMembers } from "@/models";
import { matchCategory } from "@/shared/categories/index.js";
import { calculateSplit } from "@/shared/split/index.js";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const amountMinor = z.number().int().min(1).max(100_000_000_00);

const expensePayload = z.object({
  title: z.string().trim().min(1).max(120),
  amountMinor,
  paidByMemberId: objectId,
  splitMemberIds: z.array(objectId).min(1).max(100),
  expenseDate: z.string().datetime().optional(),
  note: z.string().trim().max(500).optional().nullable(),
});

const paymentPayload = z
  .object({
    fromMemberId: objectId,
    toMemberId: objectId,
    amountMinor,
    note: z.string().trim().max(500).optional().nullable(),
  })
  .refine((v) => v.fromMemberId !== v.toMemberId, { message: "Pick two different people" });

export const createRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("expense"),
    viewerKey: z.string().min(16).max(64),
    memberId: objectId,
    expense: expensePayload,
  }),
  z.object({
    kind: z.literal("payment"),
    viewerKey: z.string().min(16).max(64),
    memberId: objectId,
    payment: paymentPayload,
  }),
]);

/** Abuse limits for unauthenticated submissions. */
export const LIMITS = { perGroupPerHour: 30, pendingPerViewer: 10 };

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

/** Normalized, validated payload stored on the request. */
export function buildPayload(group, input) {
  const ids = activeIds(group);
  const need = (id) => {
    if (!ids.has(String(id))) throw new RequestError("Someone in this request is no longer in the group");
  };
  if (input.kind === "expense") {
    const e = input.expense;
    const splitMemberIds = [...new Set(e.splitMemberIds)];
    need(e.paidByMemberId);
    splitMemberIds.forEach(need);
    return {
      title: e.title,
      amountMinor: e.amountMinor,
      paidByMemberId: e.paidByMemberId,
      splitMemberIds,
      expenseDate: e.expenseDate || new Date().toISOString(),
      note: e.note || null,
    };
  }
  const p = input.payment;
  need(p.fromMemberId);
  need(p.toMemberId);
  return { fromMemberId: p.fromMemberId, toMemberId: p.toMemberId, amountMinor: p.amountMinor, note: p.note || null };
}

export function serializeRequest(r) {
  return {
    _id: String(r._id),
    kind: r.kind,
    status: r.status,
    submittedByMemberId: String(r.submittedByMemberId),
    submitterName: r.submitterName,
    payload: r.payload,
    rejectReason: r.rejectReason || null,
    recordId: r.recordId ? String(r.recordId) : null,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt || null,
  };
}

/** Throws when the link is being flooded. */
export async function assertWithinLimits(groupId, viewerKey) {
  const hourAgo = new Date(Date.now() - 3600_000);
  const [recent, pending] = await Promise.all([
    ShareRequest.countDocuments({ groupId, createdAt: { $gte: hourAgo } }),
    ShareRequest.countDocuments({ groupId, viewerKey, status: "PENDING" }),
  ]);
  if (recent >= LIMITS.perGroupPerHour) {
    throw new RequestError("This group got a lot of requests in the last hour. Try again later.", 429);
  }
  if (pending >= LIMITS.pendingPerViewer) {
    throw new RequestError("You already have several requests waiting. Wait for them to be reviewed.", 429);
  }
}

/**
 * Approve: atomically claim the request (so two reviewers can't both approve it),
 * then create the real record. If creating fails, the claim is released.
 */
export async function approveRequest({ requestId, groupId, user }) {
  const group = await Group.findById(groupId).lean();
  const existing = await ShareRequest.findOne({ _id: requestId, groupId }).lean();
  if (!existing) throw new RequestError("Request not found", 404);
  if (existing.status !== "PENDING") throw new RequestError("This request was already reviewed", 409);
  // Members may have left since it was sent.
  buildPayload(group, existing.kind === "expense"
    ? { kind: "expense", expense: { ...existing.payload } }
    : { kind: "payment", payment: { ...existing.payload } });

  const recordId = new mongoose.Types.ObjectId();
  const claimed = await ShareRequest.findOneAndUpdate(
    { _id: requestId, groupId, status: "PENDING" },
    { $set: { status: "APPROVED", reviewedById: user._id, reviewedAt: new Date(), recordId } },
    { new: true }
  ).lean();
  if (!claimed) throw new RequestError("This request was already reviewed", 409);

  const p = claimed.payload;
  try {
    if (claimed.kind === "expense") {
      const split = calculateSplit({
        method: "EQUAL",
        totalMinor: p.amountMinor,
        participants: p.splitMemberIds.map((memberId) => ({ memberId })),
      });
      if (!split.valid) throw new RequestError(split.errors.join("; "));
      const { category } = matchCategory(p.title);
      const included = new Set(p.splitMemberIds.map(String));
      await Expense.create({
        _id: recordId,
        groupId,
        title: p.title,
        description: p.note || null,
        amountMinor: p.amountMinor,
        currency: group.currency || "INR",
        categoryKey: category.key,
        icon: null,
        splitMethod: "EQUAL",
        createdById: user._id,
        expenseDate: new Date(p.expenseDate),
        payers: [{ memberId: p.paidByMemberId, amountMinor: p.amountMinor }],
        participants: activeMembers(group).map((m) => ({
          memberId: m._id,
          included: included.has(String(m._id)),
          inputValue: null,
        })),
        splits: split.splits,
      });
      await recordActivity({
        groupId,
        actorId: user._id,
        action: "EXPENSE_CREATED",
        entityType: "expense",
        entityId: recordId,
        metadata: { title: p.title, amountMinor: p.amountMinor, source: "share-request", requestedBy: claimed.submitterName },
      });
    } else {
      const title = `${memberName(group, p.fromMemberId)} paid ${memberName(group, p.toMemberId)}`;
      await Transfer.create({
        _id: recordId,
        groupId,
        fromMemberId: p.fromMemberId,
        toMemberId: p.toMemberId,
        amountMinor: p.amountMinor,
        currency: group.currency || "INR",
        title,
        icon: "💸",
        note: p.note || title,
        createdById: user._id,
        transferDate: claimed.createdAt,
      });
      await recordActivity({
        groupId,
        actorId: user._id,
        action: "TRANSFER_CREATED",
        entityType: "transfer",
        entityId: recordId,
        metadata: { title, amountMinor: p.amountMinor, source: "share-request", requestedBy: claimed.submitterName },
      });
    }
  } catch (error) {
    await ShareRequest.updateOne(
      { _id: requestId },
      { $set: { status: "PENDING", reviewedById: null, reviewedAt: null, recordId: null } }
    );
    throw error;
  }
  return claimed;
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
