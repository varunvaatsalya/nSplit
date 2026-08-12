import mongoose from "mongoose";
import { SplitMethod, applyIdTransform } from "./_utils.js";

const { Schema, models, model } = mongoose;

const ReceiverSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    amountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const AttachmentEmbedded = new Schema(
  {
    url: String,
    mimeType: String,
    sizeBytes: Number,
    uploadedById: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const IncomeSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    categoryKey: { type: String, default: null },
    icon: { type: String, default: null },
    splitMethod: { type: String, enum: SplitMethod, default: "EQUAL" },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientMutationId: { type: String, unique: true, sparse: true },
    version: { type: Number, default: 1 },
    incomeDate: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
    receivers: { type: [ReceiverSchema], default: [] },
    attachments: { type: [AttachmentEmbedded], default: [] },
  },
  { timestamps: true }
);

IncomeSchema.index({ groupId: 1, deletedAt: 1, incomeDate: -1 });
applyIdTransform(IncomeSchema);

export const Income = models.Income || model("Income", IncomeSchema);
