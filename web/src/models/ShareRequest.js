import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

export const ShareRequestKind = ["expense", "payment", "join"];
export const ShareRequestStatus = ["PENDING", "APPROVED", "REJECTED"];

/**
 * Something a group admin must approve:
 * - join: a signed-in user asks to become one of the group's members (by name);
 * - expense / payment: a member suggests a record; approval creates it.
 */
const ShareRequestSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    kind: { type: String, enum: ShareRequestKind, required: true },
    status: { type: String, enum: ShareRequestStatus, default: "PENDING" },
    // join: the member name being claimed. expense/payment: the member who sent it.
    submittedByMemberId: { type: Schema.Types.ObjectId, required: true },
    submitterName: { type: String, required: true },
    // The signed-in account behind the request (shown to admins).
    requesterUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    requesterName: { type: String, default: null },
    requesterEmail: { type: String, default: null },
    // Legacy anonymous link requests only.
    viewerKey: { type: String, default: null },
    // join: {} (the claimed member is submittedByMemberId)
    // expense: the expense form payload with computed splits
    // payment: { fromMemberId, toMemberId, amountMinor, title, note, transferDate }
    payload: { type: Schema.Types.Mixed, required: true },
    rejectReason: { type: String, default: null },
    reviewedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    // The expense / transfer created on approval.
    recordId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

ShareRequestSchema.index({ groupId: 1, status: 1, createdAt: -1 });
ShareRequestSchema.index({ groupId: 1, requesterUserId: 1, status: 1 });

export const ShareRequest = models.ShareRequest || model("ShareRequest", ShareRequestSchema);
