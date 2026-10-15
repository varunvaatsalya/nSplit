import { connectDb } from "@/lib/db";
import { Expense, Transfer } from "@/models";
import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireGroupPermission } from "@/lib/permissions";
import { serializeExpense } from "@/lib/expenses/service";
import { serializeTransfer } from "@/lib/transfers/serialize";
import { Actions } from "@/shared/permissions/index.js";

/**
 * Every live expense and transfer in the group. The group screen needs the full
 * history at once: the feed shows both kinds together, and balances and running
 * balances are computed from all of them (same engine as the app).
 */
export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.VIEW_EXPENSES);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const filter = { groupId: membership.groupId, deletedAt: null };
  const [expenses, transfers] = await Promise.all([
    Expense.find(filter).sort({ expenseDate: -1, _id: -1 }).lean(),
    Transfer.find(filter).sort({ transferDate: -1, _id: -1 }).lean(),
  ]);

  return ok({
    expenses: expenses.map(serializeExpense),
    transfers: transfers.map(serializeTransfer),
  });
}
