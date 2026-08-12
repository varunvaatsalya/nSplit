import { connectDb, withTransaction } from "@/lib/db";
import { Expense } from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { calculateSplit, validatePayers } from "@/shared/split/index.js";
import { updateExpenseSchema } from "@/lib/validations/records";
import { serializeExpense } from "@/lib/expenses/service";

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: groupId, expenseId } = await params;
  try {
    await requireGroupPermission(auth.user.id, groupId, Actions.VIEW_EXPENSES);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const expense = await Expense.findOne({
    _id: expenseId,
    groupId,
    deletedAt: null,
  }).lean();
  if (!expense) return fail("Expense not found", 404);
  return ok({ expense: serializeExpense(expense) });
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: groupId, expenseId } = await params;
  try {
    await requireGroupPermission(auth.user.id, groupId, Actions.EDIT_EXPENSE);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = updateExpenseSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const existing = await Expense.findOne({
    _id: expenseId,
    groupId,
    deletedAt: null,
  }).lean();
  if (!existing) return fail("Expense not found", 404);

  if (
    parsed.data.baseVersion != null &&
    parsed.data.baseVersion < existing.version
  ) {
    return fail("Conflict: expense was updated on the server", 409, "CONFLICT", {
      serverVersion: existing.version,
    });
  }

  try {
    const expense = await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      const amountMinor = parsed.data.amountMinor ?? existing.amountMinor;
      const splitMethod = parsed.data.splitMethod ?? existing.splitMethod;

      if (parsed.data.payers) {
        const payerCheck = validatePayers({
          totalMinor: amountMinor,
          payers: parsed.data.payers,
        });
        if (!payerCheck.valid) {
          const err = new Error(payerCheck.errors.join("; "));
          err.status = 422;
          throw err;
        }
      }

      let splits = existing.splits;
      if (
        parsed.data.participants ||
        parsed.data.splitMethod ||
        parsed.data.amountMinor
      ) {
        const participants =
          parsed.data.participants?.filter((p) => p.included !== false) ||
          (existing.participants || [])
            .filter((p) => p.included !== false)
            .map((p) => ({
              memberId: String(p.memberId),
              inputValue: null,
            }));

        const splitResult = calculateSplit({
          method: splitMethod,
          totalMinor: amountMinor,
          participants: participants.map((p) => ({
            memberId: String(p.memberId),
            inputValue: p.inputValue,
          })),
        });
        if (!splitResult.valid) {
          const err = new Error(splitResult.errors.join("; "));
          err.status = 422;
          throw err;
        }
        splits = splitResult.splits;
      }

      const $set = {
        version: existing.version + 1,
        splits,
      };
      if (parsed.data.title !== undefined) $set.title = parsed.data.title;
      if (parsed.data.description !== undefined) $set.description = parsed.data.description;
      if (parsed.data.amountMinor !== undefined) $set.amountMinor = parsed.data.amountMinor;
      if (parsed.data.currency !== undefined) $set.currency = parsed.data.currency;
      if (parsed.data.icon !== undefined) $set.icon = parsed.data.icon;
      if (parsed.data.categoryId !== undefined) $set.categoryKey = parsed.data.categoryId;
      if (parsed.data.splitMethod !== undefined) $set.splitMethod = parsed.data.splitMethod;
      if (parsed.data.expenseDate) $set.expenseDate = new Date(parsed.data.expenseDate);
      if (parsed.data.payers) $set.payers = parsed.data.payers;
      if (parsed.data.participants) {
        $set.participants = parsed.data.participants.map((p) => ({
          memberId: p.memberId,
          included: p.included !== false,
        }));
      }

      await Expense.updateOne({ _id: expenseId }, { $set }, opts);
      await recordActivity({
        session,
        groupId,
        actorId: auth.user.id,
        action: "EXPENSE_UPDATED",
        entityType: "expense",
        entityId: expenseId,
        metadata: { title: parsed.data.title ?? existing.title },
      });

      return Expense.findById(expenseId).session(session || null).lean();
    });

    return ok({ expense: serializeExpense(expense) });
  } catch (e) {
    return fail(e.message, e.status || 400, e.code);
  }
}

export async function DELETE(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: groupId, expenseId } = await params;
  try {
    await requireGroupPermission(auth.user.id, groupId, Actions.DELETE_EXPENSE);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const existing = await Expense.findOne({
    _id: expenseId,
    groupId,
    deletedAt: null,
  }).lean();
  if (!existing) return fail("Expense not found", 404);

  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    await Expense.updateOne(
      { _id: expenseId },
      { $set: { deletedAt: new Date() }, $inc: { version: 1 } },
      opts
    );
    await recordActivity({
      session,
      groupId,
      actorId: auth.user.id,
      action: "EXPENSE_DELETED",
      entityType: "expense",
      entityId: expenseId,
      metadata: { title: existing.title },
    });
  });

  return ok({ success: true });
}
