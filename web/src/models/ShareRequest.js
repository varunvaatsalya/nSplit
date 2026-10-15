import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

export const ShareRequestKind = ["expense", "payment"];
export const ShareRequestStatus = ["PENDING", "APPROVED", "REJECTED"];

/**
 * A change suggested from a public share link. It never touches the ledger until a
 * group member approves it; approval creates the real expense or transfer.
 */
const ShareRequestSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    kind: { type: String, enum: ShareRequestKind, required: true },
    status: { type: String, enum: ShareRequestStatus, default: "PENDING" },
    // Who the viewer said they are (picked from the member list; not verified).
    submittedByMemberId: { type: Schema.Types.ObjectId, required: true },
    submitterName: { type: String, required: true },
    // Random id kept in the viewer's browser, so they can follow their own requests.
    viewerKey: { type: String, required: true },
    // expense: { title, amountMinor, paidByMemberId, splitMemberIds, expenseDate, note }
    // payment: { fromMemberId, toMemberId, amountMinor, note }
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
ShareRequestSchema.index({ groupId: 1, viewerKey: 1, createdAt: -1 });

export const ShareRequest = models.ShareRequest || model("ShareRequest", ShareRequestSchema);
