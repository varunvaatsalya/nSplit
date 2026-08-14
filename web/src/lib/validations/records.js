import { z } from "zod";
import { SplitMethodEnum } from "@/lib/validations/groups";

const payerSchema = z.object({
  memberId: z.string().min(1),
  amountMinor: z.number().int().nonnegative(),
});

const participantSchema = z.object({
  memberId: z.string().min(1),
  included: z.boolean().default(true),
  inputValue: z.number().optional().nullable(),
});

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  amountMinor: z.number().int().positive(),
  currency: z.string().trim().min(3).max(3).optional(),
  categoryId: z.string().optional().nullable(),
  icon: z.string().trim().max(64).optional().nullable(),
  splitMethod: SplitMethodEnum,
  expenseDate: z.string().datetime().optional(),
  payers: z.array(payerSchema).min(1),
  participants: z.array(participantSchema).min(1),
  clientMutationId: z.string().uuid().optional(),
  baseVersion: z.number().int().optional(),
  attachmentUrl: z.string().url().optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  clientMutationId: z.string().uuid().optional(),
  baseVersion: z.number().int().optional(),
});

export const createIncomeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  amountMinor: z.number().int().positive(),
  currency: z.string().trim().min(3).max(3).optional(),
  categoryId: z.string().optional().nullable(),
  icon: z.string().trim().max(64).optional().nullable(),
  splitMethod: SplitMethodEnum.default("EQUAL"),
  incomeDate: z.string().datetime().optional(),
  receivers: z
    .array(
      z.object({
        memberId: z.string().min(1),
        amountMinor: z.number().int().nonnegative().optional(),
        inputValue: z.number().optional().nullable(),
      })
    )
    .min(1),
  clientMutationId: z.string().uuid().optional(),
});

export const createTransferSchema = z.object({
  title: z.string().trim().min(1).max(200),
  icon: z.string().trim().max(64).optional().nullable(),
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amountMinor: z.number().int().positive(),
  currency: z.string().trim().min(3).max(3).optional(),
  note: z.string().trim().max(2000).optional().nullable(),
  transferDate: z.string().datetime().optional(),
  clientMutationId: z.string().uuid().optional(),
}).refine((v) => v.fromMemberId !== v.toMemberId, {
  message: "fromMemberId and toMemberId must differ",
});
