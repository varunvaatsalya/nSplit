import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const TransferSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    fromMemberId: { type: Schema.Types.ObjectId, required: true },
    toMemberId: { type: Schema.Types.ObjectId, required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    note: { type: String, default: null },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientMutationId: { type: String, unique: true, sparse: true },
    version: { type: Number, default: 1 },
    transferDate: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TransferSchema.index({ groupId: 1, deletedAt: 1, transferDate: -1 });

if (models.Transfer) {
  delete models.Transfer;
}

export const Transfer = model("Transfer", TransferSchema);
