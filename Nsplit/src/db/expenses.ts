import type { Expense, GroupBalance, GroupDetail } from '@/src/api/types';
import { computeGroupBalances } from '@/src/lib/balance';
import { calculateSplit } from '@/src/lib/split';

import { getDb } from './client';
import { getGroup } from './groups';
import { createId } from './ids';

type ExpenseRow = {
  id: string;
  group_id: string;
  title: string | null;
  amount_minor: number | null;
  currency: string | null;
  icon: string | null;
  category_key: string | null;
  split_method: string | null;
  expense_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  json: string | null;
};

export type ExpenseWriteInput = {
  title: string;
  description?: string | null;
  amountMinor: number;
  splitMethod: string;
  icon?: string | null;
  categoryId?: string | null;
  expenseDate?: string;
  payers: { memberId: string; amountMinor: number }[];
  participants: { memberId: string; included?: boolean; inputValue?: number | null }[];
  createdById?: string | null;
};

type ExpenseJson = {
  description?: string | null;
  currency?: string;
  splitMethod?: string;
  createdById?: string | null;
  version?: number;
  payers?: Expense['payers'];
  participants?: Expense['participants'];
  splits?: Expense['splits'];
};

function parseJson(raw: string | null): ExpenseJson {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ExpenseJson;
  } catch {
    return {};
  }
}

function mapExpense(row: ExpenseRow): Expense {
  const extra = parseJson(row.json);
  return {
    _id: row.id,
    title: row.title || '',
    description: extra.description ?? null,
    amountMinor: Number(row.amount_minor || 0),
    currency: row.currency || extra.currency,
    icon: row.icon,
    categoryKey: row.category_key,
    splitMethod: row.split_method || extra.splitMethod,
    expenseDate: row.expense_date || undefined,
    createdAt: row.created_at || undefined,
    createdById: extra.createdById || undefined,
    version: extra.version || 1,
    payers: extra.payers || [],
    participants: extra.participants || [],
    splits: extra.splits || [],
  };
}

function buildRecord(input: ExpenseWriteInput, group: GroupDetail, existing?: Expense | null) {
  const included = (input.participants || []).filter((p) => p.included !== false);
  const splitResult = calculateSplit({
    method: input.splitMethod,
    totalMinor: input.amountMinor,
    participants: included.map((p) => ({
      memberId: p.memberId,
      inputValue: p.inputValue,
    })),
  });
  if (!splitResult.valid) {
    throw new Error(splitResult.errors.join('; ') || 'Invalid split');
  }

  const now = new Date().toISOString();
  const expense: Expense = {
    _id: existing?._id || createId(),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    amountMinor: input.amountMinor,
    currency: group.currency || 'INR',
    icon: input.icon || null,
    categoryKey: input.categoryId || null,
    splitMethod: input.splitMethod,
    expenseDate: input.expenseDate || now,
    createdAt: existing?.createdAt || now,
    createdById: existing?.createdById || input.createdById || undefined,
    version: (existing?.version || 0) + 1,
    payers: input.payers,
    participants: input.participants,
    splits: splitResult.splits,
  };

  return { expense, now };
}

export async function listExpenses(groupId: string): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT id, group_id, title, amount_minor, currency, icon, category_key, split_method,
            expense_date, created_at, updated_at, json
     FROM expenses
     WHERE group_id = ? AND deleted_at IS NULL
     ORDER BY expense_date DESC, created_at DESC`,
    [groupId]
  );
  return rows.map(mapExpense);
}

export async function getExpense(groupId: string, expenseId: string): Promise<Expense | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ExpenseRow>(
    `SELECT id, group_id, title, amount_minor, currency, icon, category_key, split_method,
            expense_date, created_at, updated_at, json
     FROM expenses
     WHERE group_id = ? AND id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [groupId, expenseId]
  );
  return row ? mapExpense(row) : null;
}

export async function saveExpense(
  groupId: string,
  input: ExpenseWriteInput,
  expenseId?: string | null
): Promise<Expense> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');

  const existing = expenseId ? await getExpense(group._id, expenseId) : null;
  if (expenseId && !existing) throw new Error('Expense not found');

  const { expense, now } = buildRecord(input, group, existing);
  const db = await getDb();
  const json = JSON.stringify({
    description: expense.description,
    currency: expense.currency,
    splitMethod: expense.splitMethod,
    createdById: expense.createdById || null,
    version: expense.version,
    payers: expense.payers,
    participants: expense.participants,
    splits: expense.splits,
  } satisfies ExpenseJson);

  await db.withTransactionAsync(async () => {
    if (existing) {
      await db.runAsync(
        `UPDATE expenses
         SET title = ?, amount_minor = ?, currency = ?, icon = ?, category_key = ?,
             split_method = ?, expense_date = ?, updated_at = ?, json = ?
         WHERE id = ? AND group_id = ?`,
        [
          expense.title,
          expense.amountMinor,
          expense.currency || 'INR',
          expense.icon || null,
          expense.categoryKey || null,
          expense.splitMethod || 'EQUAL',
          expense.expenseDate || now,
          now,
          json,
          expense._id,
          group._id,
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO expenses
          (id, group_id, title, amount_minor, currency, icon, category_key, split_method,
           expense_date, created_at, updated_at, json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          expense._id,
          group._id,
          expense.title,
          expense.amountMinor,
          expense.currency || 'INR',
          expense.icon || null,
          expense.categoryKey || null,
          expense.splitMethod || 'EQUAL',
          expense.expenseDate || now,
          expense.createdAt || now,
          now,
          json,
        ]
      );
    }

    await db.runAsync(`UPDATE groups SET updated_at = ? WHERE id = ?`, [now, group._id]);
  });

  return expense;
}

export async function deleteExpense(groupId: string, expenseId: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
    [now, now, expenseId, groupId]
  );
  await db.runAsync(`UPDATE groups SET updated_at = ? WHERE id = ?`, [now, groupId]);
}

export function groupBalance(group: GroupDetail, expenses: Expense[]): GroupBalance {
  const members = group.members || [];
  const result = computeGroupBalances({
    members: members.map((m) => ({ id: m._id })),
    expenses: expenses.map((e) => ({
      payers: e.payers || [],
      splits: e.splits || [],
    })),
  });
  const nameById = Object.fromEntries(members.map((m) => [m._id, m.displayName || 'Member']));

  return {
    currency: group.currency,
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
    pairwise: result.pairwise.map((p) => ({
      from: p.from,
      to: p.to,
      amountMinor: p.amountMinor,
      fromName: nameById[p.from],
      toName: nameById[p.to],
    })),
  };
}
