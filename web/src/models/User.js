import mongoose from "mongoose";
import { applyIdTransform } from "./_utils.js";

const { Schema, models, model } = mongoose;

const OAuthAccountEmbedded = new Schema(
  {
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    emailVerified: { type: Date, default: null },
    oauthAccounts: { type: [OAuthAccountEmbedded], default: [] },
  },
  { timestamps: true }
);

applyIdTransform(UserSchema);

export const User = models.User || model("User", UserSchema);
