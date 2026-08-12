/**
 * Authoritative balance engine (pure).
 * netMinor > 0 → others owe this member (credit)
 * netMinor < 0 → this member owes (debt)
 */

function emptyBucket() {
  return {
    paidMinor: 0,
    owedMinor: 0,
    incomeMinor: 0,
    transferredOutMinor: 0,
    transferredInMinor: 0,
    netMinor: 0,
  };
}

function ensure(map, memberId) {
  if (!map[memberId]) map[memberId] = emptyBucket();
  return map[memberId];
}

/**
 * @param {{
 *   members: { id: string }[],
 *   expenses?: { deletedAt?: any, payers: { memberId: string, amountMinor: number }[], splits: { memberId: string, amountMinor: number }[] }[],
 *   incomes?: { deletedAt?: any, receivers: { memberId: string, amountMinor: number }[] }[],
 *   transfers?: { deletedAt?: any, fromMemberId: string, toMemberId: string, amountMinor: number }[],
 * }} input
 */
export function computeGroupBalances({
  members = [],
  expenses = [],
  incomes = [],
  transfers = [],
}) {
  /** @type {Record<string, ReturnType<typeof emptyBucket>>} */
  const byMemberId = {};
  for (const m of members) {
    ensure(byMemberId, m.id);
  }

  for (const expense of expenses) {
    if (expense.deletedAt) continue;
    for (const payer of expense.payers || []) {
      ensure(byMemberId, payer.memberId).paidMinor += payer.amountMinor;
    }
    for (const split of expense.splits || []) {
      ensure(byMemberId, split.memberId).owedMinor += split.amountMinor;
    }
  }

  for (const income of incomes) {
    if (income.deletedAt) continue;
    for (const receiver of income.receivers || []) {
      ensure(byMemberId, receiver.memberId).incomeMinor += receiver.amountMinor;
    }
  }

  for (const transfer of transfers) {
    if (transfer.deletedAt) continue;
    // Paying a transfer reduces what you owe (increases net).
    // Receiving a transfer reduces what you are owed (decreases net).
    ensure(byMemberId, transfer.fromMemberId).transferredOutMinor += transfer.amountMinor;
    ensure(byMemberId, transfer.toMemberId).transferredInMinor += transfer.amountMinor;
  }

  for (const memberId of Object.keys(byMemberId)) {
    const b = byMemberId[memberId];
    b.netMinor =
      b.paidMinor -
      b.owedMinor +
      b.incomeMinor +
      b.transferredOutMinor -
      b.transferredInMinor;
  }

  const pairwise = simplifyPairwise(byMemberId);

  return { byMemberId, pairwise };
}

/**
 * Greedy pairwise settlement suggestion from nets.
 * Creditors (net > 0) receive from debtors (net < 0).
 */
export function simplifyPairwise(byMemberId) {
  const debtors = [];
  const creditors = [];

  for (const [memberId, b] of Object.entries(byMemberId)) {
    if (b.netMinor < 0) debtors.push({ memberId, amount: -b.netMinor });
    else if (b.netMinor > 0) creditors.push({ memberId, amount: b.netMinor });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const pairwise = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      pairwise.push({
        from: debtors[i].memberId,
        to: creditors[j].memberId,
        amountMinor: pay,
      });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i += 1;
    if (creditors[j].amount === 0) j += 1;
  }
  return pairwise;
}
