import type { Expense, Transfer } from '@/src/api/types';

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

function recordTime(value?: string | null) {
  const t = new Date(value || '').getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Replays expenses and transfers oldest-first and records, for every member
 * touched by each record, what they paid, their share, and their running net
 * balance before and after. Uses the same sign convention as the balance
 * engine: net > 0 means the member gets money back.
 */
export function buildLedger(expenses: Expense[], transfers: Transfer[]) {
  const records = [
    ...expenses.map((expense) => ({
      kind: 'expense' as const,
      id: expense._id,
      title: expense.title,
      icon: expense.icon,
      categoryKey: expense.categoryKey,
      amountMinor: expense.amountMinor,
      time: recordTime(expense.expenseDate || expense.createdAt),
      created: recordTime(expense.createdAt),
      moves: [
        ...(expense.payers || []).map((p) => ({ memberId: p.memberId, paid: p.amountMinor, share: 0 })),
        ...(expense.splits || []).map((s) => ({ memberId: s.memberId, paid: 0, share: s.amountMinor })),
      ],
    })),
    ...transfers.map((transfer) => ({
      kind: 'transfer' as const,
      id: transfer._id,
      title: transfer.title,
      icon: transfer.icon,
      categoryKey: null,
      amountMinor: transfer.amountMinor,
      time: recordTime(transfer.transferDate || transfer.createdAt),
      created: recordTime(transfer.createdAt),
      moves: [
        { memberId: transfer.fromMemberId, paid: transfer.amountMinor, share: 0 },
        { memberId: transfer.toMemberId, paid: 0, share: transfer.amountMinor },
      ],
    })),
  ].sort((a, b) => a.time - b.time || a.created - b.created || a.id.localeCompare(b.id));

  const running: Record<string, number> = {};
  const entries: LedgerEntry[] = [];

  for (const record of records) {
    const lines: Record<string, LedgerLine> = {};
    for (const move of record.moves) {
      if (!move.paid && !move.share) continue;
      const line = (lines[move.memberId] ??= {
        paidMinor: 0,
        shareMinor: 0,
        deltaMinor: 0,
        beforeMinor: running[move.memberId] || 0,
        afterMinor: 0,
      });
      line.paidMinor += move.paid;
      line.shareMinor += move.share;
    }
    for (const [memberId, line] of Object.entries(lines)) {
      line.deltaMinor = line.paidMinor - line.shareMinor;
      line.afterMinor = line.beforeMinor + line.deltaMinor;
      running[memberId] = line.afterMinor;
    }
    entries.push({
      kind: record.kind,
      id: record.id,
      title: record.title,
      icon: record.icon,
      categoryKey: record.categoryKey,
      date: new Date(record.time),
      amountMinor: record.amountMinor,
      lines,
    });
  }

  const byRecordId = Object.fromEntries(entries.map((e) => [`${e.kind}:${e.id}`, e]));
  return { entries, byRecordId };
}

export type Ledger = ReturnType<typeof buildLedger>;

/** Totals for one member across the whole ledger. */
export function memberTotals(ledger: Ledger, memberId: string) {
  const totals = { paidMinor: 0, shareMinor: 0, sentMinor: 0, receivedMinor: 0 };
  for (const entry of ledger.entries) {
    const line = entry.lines[memberId];
    if (!line) continue;
    if (entry.kind === 'expense') {
      totals.paidMinor += line.paidMinor;
      totals.shareMinor += line.shareMinor;
    } else {
      totals.sentMinor += line.paidMinor;
      totals.receivedMinor += line.shareMinor;
    }
  }
  return totals;
}
