import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const OAuthAccountEmbedded = new Schema(
  {
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AvatarEmbedded = new Schema(
  {
    url: { type: String, default: null },
    letters: { type: String, default: null, uppercase: true, trim: true },
    bg: { type: String, default: null },
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
    avatar: { type: AvatarEmbedded, default: () => ({}) },
    emailVerified: { type: Date, default: null },
    oauthAccounts: { type: [OAuthAccountEmbedded], default: [] },
  },
  { timestamps: true }
);

if (models.User) {
  delete models.User;
}

export const User = model("User", UserSchema);
