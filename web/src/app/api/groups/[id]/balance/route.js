import { connectDb } from "@/lib/db";
import { Expense, Group, Income, Transfer, activeMembers } from "@/models";
import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { computeGroupBalances } from "@/shared/balance/index.js";
import { getCategoryByKey } from "@/shared/categories/index.js";

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.VIEW_BALANCES);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }
  const groupId = membership.groupId;

  await connectDb();
  const [group, expenses, incomes, transfers] = await Promise.all([
    Group.findById(groupId).lean(),
    Expense.find({ groupId, deletedAt: null }).lean(),
    Income.find({ groupId, deletedAt: null }).lean(),
    Transfer.find({ groupId, deletedAt: null }).lean(),
  ]);

  if (!group) return fail("Group not found", 404);

  const members = activeMembers(group);
  const memberIds = members.map((m) => String(m._id));
  const nameById = Object.fromEntries(
    members.map((m) => [String(m._id), m.displayName || "Member"])
  );

  const balances = computeGroupBalances({
    members: memberIds.map((id) => ({ id })),
    expenses: expenses.map((e) => ({
      deletedAt: e.deletedAt,
      payers: (e.payers || []).map((p) => ({
        memberId: String(p.memberId),
        amountMinor: p.amountMinor,
      })),
      splits: (e.splits || []).map((s) => ({
        memberId: String(s.memberId),
        amountMinor: s.amountMinor,
      })),
    })),
    incomes: incomes.map((i) => ({
      deletedAt: i.deletedAt,
      receivers: (i.receivers || []).map((r) => ({
        memberId: String(r.memberId),
        amountMinor: r.amountMinor,
      })),
    })),
    transfers: transfers.map((t) => ({
      deletedAt: t.deletedAt,
      fromMemberId: String(t.fromMemberId),
      toMemberId: String(t.toMemberId),
      amountMinor: t.amountMinor,
    })),
  });

  const categoryMap = new Map();
  let totalExpenseMinor = 0;
  for (const expense of expenses) {
    if (expense.deletedAt) continue;
    const key = expense.categoryKey || "other";
    const amount = Number(expense.amountMinor) || 0;
    totalExpenseMinor += amount;
    if (!categoryMap.has(key)) {
      const meta = getCategoryByKey(key);
      categoryMap.set(key, {
        key,
        label: meta.label,
        emoji: meta.emoji || "🧾",
        amountMinor: 0,
        count: 0,
      });
    }
    const row = categoryMap.get(key);
    row.amountMinor += amount;
    row.count += 1;
  }

  const categories = [...categoryMap.values()].sort(
    (a, b) => b.amountMinor - a.amountMinor
  );

  const memberRows = members.map((m) => {
    const id = String(m._id);
    const bucket = balances.byMemberId[id] || {
      paidMinor: 0,
      owedMinor: 0,
      incomeMinor: 0,
      transferredOutMinor: 0,
      transferredInMinor: 0,
      netMinor: 0,
    };
    return {
      _id: id,
      userId: m.userId ? String(m.userId) : null,
      displayName: m.displayName,
      ...bucket,
    };
  });

  const pairwise = (balances.pairwise || []).map((p) => ({
    ...p,
    fromName: nameById[p.from] || "Member",
    toName: nameById[p.to] || "Member",
  }));

  const owedTotal = memberRows.reduce(
    (s, m) => s + Math.max(0, -m.netMinor),
    0
  );
  const creditTotal = memberRows.reduce(
    (s, m) => s + Math.max(0, m.netMinor),
    0
  );

  return ok({
    currency: group.currency || "INR",
    balances: balances.byMemberId,
    pairwise,
    members: memberRows,
    categories,
    summary: {
      memberCount: members.length,
      expenseCount: expenses.length,
      transferCount: transfers.length,
      incomeCount: incomes.length,
      totalExpenseMinor,
      unsettledMinor: Math.max(owedTotal, creditTotal),
      creditors: memberRows.filter((m) => m.netMinor > 0).length,
      debtors: memberRows.filter((m) => m.netMinor < 0).length,
      settled: memberRows.filter((m) => m.netMinor === 0).length,
    },
  });
}
