type MemberBucket = {
  paidMinor: number;
  owedMinor: number;
  incomeMinor: number;
  transferredOutMinor: number;
  transferredInMinor: number;
  netMinor: number;
};

function emptyBucket(): MemberBucket {
  return {
    paidMinor: 0,
    owedMinor: 0,
    incomeMinor: 0,
    transferredOutMinor: 0,
    transferredInMinor: 0,
    netMinor: 0,
  };
}

export function computeGroupBalances({
  members = [],
  expenses = [],
  transfers = [],
}: {
  members?: { id: string }[];
  expenses?: {
    payers?: { memberId: string; amountMinor: number }[];
    splits?: { memberId: string; amountMinor: number }[];
  }[];
  transfers?: {
    fromMemberId: string;
    toMemberId: string;
    amountMinor: number;
  }[];
}) {
  const byMemberId: Record<string, MemberBucket> = {};
  for (const member of members) {
    byMemberId[member.id] = emptyBucket();
  }

  for (const expense of expenses) {
    for (const payer of expense.payers || []) {
      if (!byMemberId[payer.memberId]) byMemberId[payer.memberId] = emptyBucket();
      byMemberId[payer.memberId].paidMinor += payer.amountMinor;
    }
    for (const split of expense.splits || []) {
      if (!byMemberId[split.memberId]) byMemberId[split.memberId] = emptyBucket();
      byMemberId[split.memberId].owedMinor += split.amountMinor;
    }
  }

  for (const transfer of transfers) {
    if (!byMemberId[transfer.fromMemberId]) byMemberId[transfer.fromMemberId] = emptyBucket();
    if (!byMemberId[transfer.toMemberId]) byMemberId[transfer.toMemberId] = emptyBucket();
    byMemberId[transfer.fromMemberId].transferredOutMinor += transfer.amountMinor;
    byMemberId[transfer.toMemberId].transferredInMinor += transfer.amountMinor;
  }

  for (const bucket of Object.values(byMemberId)) {
    bucket.netMinor =
      bucket.paidMinor -
      bucket.owedMinor +
      bucket.incomeMinor +
      bucket.transferredOutMinor -
      bucket.transferredInMinor;
  }

  return { byMemberId, pairwise: simplifyPairwise(byMemberId) };
}

function simplifyPairwise(byMemberId: Record<string, MemberBucket>) {
  const debtors = [];
  const creditors = [];

  for (const [memberId, bucket] of Object.entries(byMemberId)) {
    if (bucket.netMinor < 0) debtors.push({ memberId, amount: -bucket.netMinor });
    else if (bucket.netMinor > 0) creditors.push({ memberId, amount: bucket.netMinor });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const pairwise: { from: string; to: string; amountMinor: number }[] = [];
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
