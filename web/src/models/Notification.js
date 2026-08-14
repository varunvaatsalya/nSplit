import mongoose from "mongoose";
import { NotificationType } from "./_utils.js";

const { Schema, models, model } = mongoose;

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: NotificationType, required: true },
    title: { type: String, required: true },
    body: { type: String, default: null },
    data: { type: Schema.Types.Mixed, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const Notification =
  models.Notification || model("Notification", NotificationSchema);
