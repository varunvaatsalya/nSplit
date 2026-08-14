import mongoose from "mongoose";
import { SplitMethod } from "./_utils.js";

const { Schema, models, model } = mongoose;

const PayerSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    amountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ParticipantSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    included: { type: Boolean, default: true },
  },
  { _id: false }
);

const SplitSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    inputValue: { type: Number, default: null },
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

const ExpenseSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    categoryKey: { type: String, default: null },
    icon: { type: String, default: null },
    splitMethod: { type: String, enum: SplitMethod, required: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientMutationId: { type: String, unique: true, sparse: true },
    version: { type: Number, default: 1 },
    expenseDate: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
    payers: { type: [PayerSchema], default: [] },
    participants: { type: [ParticipantSchema], default: [] },
    splits: { type: [SplitSchema], default: [] },
    attachments: { type: [AttachmentEmbedded], default: [] },
  },
  { timestamps: true }
);

ExpenseSchema.index({ groupId: 1, deletedAt: 1, expenseDate: -1 });

if (models.Expense) {
  delete models.Expense;
}

export const Expense = model("Expense", ExpenseSchema);
