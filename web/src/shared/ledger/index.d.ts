/** One member's movement in a single record. All values in minor units. */
export type LedgerLine = {
  /** What this member paid out (expense payer, or transfer sender). */
  paidMinor: number;
  /** This member's share of the expense, or what they received in a transfer. */
  shareMinor: number;
  /** Effect on net balance: paid − share (positive = others owe them more). */
  deltaMinor: number;
  beforeMinor: number;
  afterMinor: number;
};

export type LedgerEntry = {
  kind: 'expense' | 'transfer';
  id: string;
  title: string;
  icon?: string | null;
  categoryKey?: string | null;
  date: Date;
  amountMinor: number;
  lines: Record<string, LedgerLine>;
};

export type Ledger = {
  entries: LedgerEntry[];
  byRecordId: Record<string, LedgerEntry>;
};

type MemberAmount = { memberId: string; amountMinor: number };

export function buildLedger(
  expenses?: {
    _id: string;
    title: string;
    icon?: string | null;
    categoryKey?: string | null;
    amountMinor: number;
    expenseDate?: string;
    createdAt?: string;
    payers?: MemberAmount[];
    splits?: MemberAmount[];
  }[],
  transfers?: {
    _id: string;
    title: string;
    icon?: string | null;
    amountMinor: number;
    transferDate?: string;
    createdAt?: string;
    fromMemberId: string;
    toMemberId: string;
  }[]
): Ledger;

export function memberTotals(
  ledger: Ledger,
  memberId: string
): { paidMinor: number; shareMinor: number; sentMinor: number; receivedMinor: number };
