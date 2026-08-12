import mongoose from "mongoose";
import { ActivityAction, applyIdTransform } from "./_utils.js";

const { Schema, models, model } = mongoose;

const ActivitySchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ActivityAction, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivitySchema.index({ groupId: 1, createdAt: -1 });
applyIdTransform(ActivitySchema);

export const Activity = models.Activity || model("Activity", ActivitySchema);
