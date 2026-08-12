import { z } from "zod";

export const MemberPermissionEnum = z.enum([
  "VIEW_ONLY",
  "ADD",
  "EDIT",
  "ADMIN",
]);

/** Permissions selectable when inviting during group create */
export const InvitePermissionEnum = z.enum(["VIEW_ONLY", "ADD", "EDIT"]);

export const SplitMethodEnum = z.enum(["EQUAL", "EXACT", "SHARES"]);

const optionalEmail = z.preprocess((value) => {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim().toLowerCase();
  return trimmed === "" ? null : trimmed;
}, z.union([z.null(), z.string().email()]));

export const createGroupMemberInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: optionalEmail,
  invite: z.boolean().default(false),
  permission: InvitePermissionEnum.default("ADD"),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional().nullable(),
  icon: z.string().trim().max(64).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  currency: z.string().trim().min(3).max(3).default("INR"),
  defaultSplitMethod: SplitMethodEnum.optional(),
  defaultSplitConfig: z
    .array(
      z.object({
        memberId: z.string().optional(),
        userId: z.string().optional(),
        value: z.number(),
      })
    )
    .optional()
    .nullable(),
  members: z.array(createGroupMemberInputSchema).max(50).default([]),
});

export const updateGroupSchema = createGroupSchema
  .omit({ members: true })
  .partial();

export const updateSettingsSchema = z.object({
  defaultSplitMethod: SplitMethodEnum.optional(),
  defaultSplitConfig: z
    .array(
      z.object({
        memberId: z.string(),
        value: z.number(),
      })
    )
    .optional()
    .nullable(),
  simplifyDebts: z.boolean().optional(),
});

export const addMemberSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: optionalEmail,
  invite: z.boolean().default(false),
  permission: InvitePermissionEnum.default("ADD"),
});

export const updateMemberSchema = z.object({
  permission: MemberPermissionEnum.optional(),
  displayName: z.string().trim().max(80).optional().nullable(),
  email: optionalEmail,
});
