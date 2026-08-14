import { connectDb, toJSON } from "@/lib/db";
import { Expense, Group, activeMembers } from "@/models";
import { calculateSplit, validatePayers } from "@/shared/split/index.js";
import { suggestCategoryFromTitle } from "@/shared/categories/index.js";

function serializeExpense(doc) {
  const e = toJSON(doc);
  e.groupId = String(e.groupId);
  e.createdById = String(e.createdById);
  e.payers = (e.payers || []).map((p) => ({
    memberId: String(p.memberId),
    amountMinor: p.amountMinor,
  }));
  e.participants = (e.participants || []).map((p) => ({
    memberId: String(p.memberId),
    included: p.included !== false,
  }));
  e.splits = (e.splits || []).map((s) => ({
    memberId: String(s.memberId),
    amountMinor: s.amountMinor,
    inputValue: s.inputValue ?? null,
  }));
  return e;
}

export async function buildExpenseCreateData({ group, userId, input, session = null }) {
  await connectDb();
  const currency = input.currency || group.currency;
  const included = input.participants.filter((p) => p.included !== false);

  const payerCheck = validatePayers({
    totalMinor: input.amountMinor,
    payers: input.payers,
  });
  if (!payerCheck.valid) {
    const err = new Error(payerCheck.errors.join("; "));
    err.code = "VALIDATION_ERROR";
    err.status = 422;
    throw err;
  }

  const splitResult = calculateSplit({
    method: input.splitMethod,
    totalMinor: input.amountMinor,
    participants: included.map((p) => ({
      memberId: p.memberId,
      inputValue: p.inputValue,
    })),
  });
  if (!splitResult.valid) {
    const err = new Error(splitResult.errors.join("; "));
    err.code = "VALIDATION_ERROR";
    err.status = 422;
    throw err;
  }

  const fresh =
    group.members != null
      ? group
      : await Group.findById(group._id)
          .session(session || null)
          .lean();
  const memberIds = new Set(activeMembers(fresh).map((m) => String(m._id)));

  for (const p of input.payers) {
    if (!memberIds.has(String(p.memberId))) {
      const err = new Error(`Unknown payer member: ${p.memberId}`);
      err.status = 422;
      throw err;
    }
  }
  for (const p of included) {
    if (!memberIds.has(String(p.memberId))) {
      const err = new Error(`Unknown participant member: ${p.memberId}`);
      err.status = 422;
      throw err;
    }
  }

  const suggested = suggestCategoryFromTitle(input.title);
  const icon = input.icon || suggested.emoji || suggested.icon;

  if (input.clientMutationId) {
    const existing = await Expense.findOne({ clientMutationId: input.clientMutationId })
      .session(session || null)
      .lean();
    if (existing) {
      return { expense: serializeExpense(existing), duplicate: true };
    }
  }

  const [expense] = await Expense.create(
    [
      {
        groupId: group._id,
        title: input.title,
        description: input.description ?? null,
        amountMinor: input.amountMinor,
        currency,
        icon,
        categoryKey: input.categoryId || suggested.key || null,
        splitMethod: input.splitMethod,
        createdById: userId,
        clientMutationId: input.clientMutationId ?? undefined,
        expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
        payers: input.payers.map((p) => ({
          memberId: p.memberId,
          amountMinor: p.amountMinor,
        })),
        participants: input.participants.map((p) => ({
          memberId: p.memberId,
          included: p.included !== false,
        })),
        splits: splitResult.splits.map((s) => ({
          memberId: s.memberId,
          amountMinor: s.amountMinor,
          inputValue: s.inputValue,
        })),
        attachments: input.attachmentUrl
          ? [{ url: input.attachmentUrl, uploadedById: userId }]
          : [],
      },
    ],
    session ? { session } : {}
  );

  return { expense: serializeExpense(expense), duplicate: false };
}

export { serializeExpense };
