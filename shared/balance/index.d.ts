export type BalanceBucket = {
  paidMinor: number;
  owedMinor: number;
  incomeMinor: number;
  transferredOutMinor: number;
  transferredInMinor: number;
  netMinor: number;
};

export type PairwiseRow = { from: string; to: string; amountMinor: number };

type Dated = { deletedAt?: unknown };

export function computeGroupBalances(input: {
  members?: { id: string }[];
  expenses?: (Dated & {
    payers?: { memberId: string; amountMinor: number }[];
    splits?: { memberId: string; amountMinor: number }[];
  })[];
  incomes?: (Dated & { receivers?: { memberId: string; amountMinor: number }[] })[];
  transfers?: (Dated & { fromMemberId: string; toMemberId: string; amountMinor: number })[];
}): { byMemberId: Record<string, BalanceBucket>; pairwise: PairwiseRow[] };

export function simplifyPairwise(byMemberId: Record<string, BalanceBucket>): PairwiseRow[];
