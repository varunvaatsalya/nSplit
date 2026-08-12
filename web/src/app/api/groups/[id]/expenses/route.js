import { connectDb, withTransaction } from "@/lib/db";
import { Expense, Group, MutationLog } from "@/models";
import { created, fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { createExpenseSchema } from "@/lib/validations/records";
import { buildExpenseCreateData, serializeExpense } from "@/lib/expenses/service";

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: groupId } = await params;
  try {
    await requireGroupPermission(auth.user.id, groupId, Actions.VIEW_EXPENSES);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const expenses = await Expense.find({ groupId, deletedAt: null })
    .sort({ expenseDate: -1, createdAt: -1 })
    .lean();

  return ok({ expenses: expenses.map(serializeExpense) });
}

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: groupId } = await params;
  try {
    await requireGroupPermission(auth.user.id, groupId, Actions.ADD_EXPENSE);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const group = await Group.findById(groupId).lean();
  if (!group) return fail("Group not found", 404);
  group.id = String(group._id);

  try {
    const result = await withTransaction(async (session) => {
      const { expense, duplicate } = await buildExpenseCreateData({
        group,
        userId: auth.user.id,
        input: parsed.data,
        session,
      });

      if (!duplicate) {
        await recordActivity({
          session,
          groupId,
          actorId: auth.user.id,
          action: "EXPENSE_CREATED",
          entityType: "expense",
          entityId: expense.id,
          metadata: {
            title: expense.title,
            amountMinor: expense.amountMinor,
            currency: expense.currency,
          },
        });

        if (parsed.data.clientMutationId) {
          const opts = session ? { session } : {};
          await MutationLog.create(
            [
              {
                mutationId: parsed.data.clientMutationId,
                userId: auth.user.id,
                type: "expense.create",
                entity: "expense",
                entityId: expense.id,
                status: "APPLIED",
                serverEntityId: expense.id,
                clientTimestamp: new Date(),
              },
            ],
            opts
          );
        }
      }

      return { expense, duplicate };
    });

    if (result.duplicate) return ok({ expense: result.expense, duplicate: true });
    return created({ expense: result.expense });
  } catch (e) {
    return fail(e.message, e.status || 400, e.code);
  }
}
