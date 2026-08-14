import mongoose from "mongoose";
import { MutationStatus } from "./_utils.js";

const { Schema, models, model } = mongoose;

const MutationLogSchema = new Schema(
  {
    mutationId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceId: { type: String, default: null },
    type: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, default: null },
    payloadHash: { type: String, default: null },
    status: { type: String, enum: MutationStatus, default: "APPLIED" },
    serverEntityId: { type: String, default: null },
    conflictReason: { type: String, default: null },
    clientTimestamp: { type: Date, default: null },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

MutationLogSchema.index({ userId: 1, processedAt: -1 });

export const MutationLog =
  models.MutationLog || model("MutationLog", MutationLogSchema);
