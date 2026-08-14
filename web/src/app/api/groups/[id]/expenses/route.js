import { connectDb, withTransaction } from "@/lib/db";
import { Expense, Group, MutationLog } from "@/models";
import { created, fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { createExpenseSchema } from "@/lib/validations/records";
import { buildExpenseCreateData, serializeExpense } from "@/lib/expenses/service";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.VIEW_EXPENSES);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }
  const groupId = membership.groupId;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") || DEFAULT_LIMIT) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const cursor = searchParams.get("cursor");

  const filter = { groupId, deletedAt: null };
  if (cursor) {
    const sep = cursor.lastIndexOf("_");
    const ts = Number(cursor.slice(0, sep));
    const lastId = cursor.slice(sep + 1);
    if (Number.isFinite(ts) && lastId) {
      const date = new Date(ts);
      filter.$or = [
        { expenseDate: { $lt: date } },
        { expenseDate: date, _id: { $lt: lastId } },
      ];
    }
  }

  await connectDb();
  const rows = await Expense.find(filter)
    .sort({ expenseDate: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? `${new Date(last.expenseDate || last.createdAt).getTime()}_${last._id}`
      : null;

  return ok({
    expenses: page.map(serializeExpense),
    nextCursor,
    hasMore,
  });
}

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.ADD_EXPENSE);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }
  const groupId = membership.groupId;

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

  try {
    const result = await withTransaction(async (session) => {
      const { expense, duplicate } = await buildExpenseCreateData({
        group,
        userId: auth.user._id,
        input: parsed.data,
        session,
      });

      if (!duplicate) {
        await recordActivity({
          session,
          groupId,
          actorId: auth.user._id,
          action: "EXPENSE_CREATED",
          entityType: "expense",
          entityId: expense._id,
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
                userId: auth.user._id,
                type: "expense.create",
                entity: "expense",
                entityId: String(expense._id),
                status: "APPLIED",
                serverEntityId: String(expense._id),
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
