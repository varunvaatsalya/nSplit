import { computeGroupBalances } from "@/shared/balance/index.js";

/**
 * Balances for the group's active members, from the same shared engine the app
 * uses, so web and phone always show identical numbers.
 */
export function groupBalance(group, expenses = [], transfers = []) {
  const members = (group?.members || []).filter((m) => !m.leftAt);
  const result = computeGroupBalances({
    members: members.map((m) => ({ id: m._id })),
    expenses: expenses.map((e) => ({ payers: e.payers || [], splits: e.splits || [] })),
    transfers: transfers.map((t) => ({
      fromMemberId: t.fromMemberId,
      toMemberId: t.toMemberId,
      amountMinor: t.amountMinor,
    })),
  });

  return {
    currency: group?.currency,
    members: members.map((m) => {
      const b = result.byMemberId[m._id] || { netMinor: 0, paidMinor: 0, owedMinor: 0 };
      return {
        _id: m._id,
        userId: m.userId,
        displayName: m.displayName,
        netMinor: b.netMinor,
        paidMinor: b.paidMinor,
        owedMinor: b.owedMinor,
      };
    }),
    pairwise: result.pairwise,
  };
}
