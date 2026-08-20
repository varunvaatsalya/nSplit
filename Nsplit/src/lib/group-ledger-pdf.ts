import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Expense, GroupBalance, GroupDetail, GroupMember, Transfer } from '@/src/api/types';
import { formatLongDate, formatMinor, memberName } from '@/src/lib/format';
import { getExpenseEmoji, getGroupEmoji } from '@/src/lib/icons';

export type LedgerExportInput = {
  group: GroupDetail;
  expenses: Expense[];
  transfers: Transfer[];
  balance: GroupBalance | null;
};

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function ledgerPeriod(expenses: Expense[], transfers: Transfer[]) {
  const dates: Date[] = [];
  for (const expense of expenses) {
    const date = parseDate(expense.expenseDate || expense.createdAt);
    if (date) dates.push(date);
  }
  for (const transfer of transfers) {
    const date = parseDate(transfer.transferDate || transfer.createdAt);
    if (date) dates.push(date);
  }
  if (!dates.length) return { from: null as Date | null, to: null as Date | null };
  dates.sort((a, b) => a.getTime() - b.getTime());
  return { from: dates[0], to: dates[dates.length - 1] };
}

function memberLabel(members: GroupMember[], id?: string | null) {
  if (!id) return 'Member';
  return memberName(members.find((m) => m._id === id));
}

function netClass(net: number) {
  if (net > 0) return 'pos';
  if (net < 0) return 'neg';
  return 'muted';
}

function netLabel(net: number, currency: string) {
  if (net > 0) return `+${formatMinor(net, currency)}`;
  if (net < 0) return `−${formatMinor(-net, currency)}`;
  return formatMinor(0, currency);
}

export function buildGroupLedgerHtml({ group, expenses, transfers, balance }: LedgerExportInput) {
  const members = group.members || [];
  const currency = group.currency || 'INR';
  const period = ledgerPeriod(expenses, transfers);
  const generated = new Date();
  const totalExpense = expenses.reduce((sum, item) => sum + (item.amountMinor || 0), 0);
  const rows: { at: number; html: string }[] = [];

  for (const expense of expenses) {
    const date = parseDate(expense.expenseDate || expense.createdAt) || generated;
    const payers = (expense.payers || [])
      .map((p) => `${escapeHtml(memberLabel(members, p.memberId))} ${escapeHtml(formatMinor(p.amountMinor, currency))}`)
      .join(' · ');
    const splits = (expense.splits || [])
      .map((s) => `${escapeHtml(memberLabel(members, s.memberId))} ${escapeHtml(formatMinor(s.amountMinor, currency))}`)
      .join(' · ');
    rows.push({
      at: date.getTime(),
      html: `
        <tr>
          <td class="date">${escapeHtml(formatLongDate(date))}</td>
          <td>
            <div class="title">${escapeHtml(getExpenseEmoji(expense.icon, expense.categoryKey))} ${escapeHtml(expense.title || 'Expense')}</div>
            <div class="sub">Paid by ${payers || '-'}</div>
            <div class="sub">Share ${splits || '-'}</div>
          </td>
          <td class="amt">${escapeHtml(formatMinor(expense.amountMinor, currency))}</td>
        </tr>`,
    });
  }

  for (const transfer of transfers) {
    const date = parseDate(transfer.transferDate || transfer.createdAt) || generated;
    rows.push({
      at: date.getTime(),
      html: `
        <tr>
          <td class="date">${escapeHtml(formatLongDate(date))}</td>
          <td>
            <div class="title">${escapeHtml(transfer.icon || '💸')} ${escapeHtml(transfer.title || 'Transfer')}</div>
            <div class="sub">${escapeHtml(memberLabel(members, transfer.fromMemberId))} → ${escapeHtml(memberLabel(members, transfer.toMemberId))}</div>
          </td>
          <td class="amt">${escapeHtml(formatMinor(transfer.amountMinor, currency))}</td>
        </tr>`,
    });
  }

  rows.sort((a, b) => a.at - b.at);

  const balanceRows = (balance?.members || []).map((m) => {
    const net = m.netMinor || 0;
    return `
      <tr>
        <td>${escapeHtml(m.displayName || 'Member')}</td>
        <td class="amt">${escapeHtml(formatMinor(m.paidMinor || 0, currency))}</td>
        <td class="amt">${escapeHtml(formatMinor(m.owedMinor || 0, currency))}</td>
        <td class="amt ${netClass(net)}">${escapeHtml(netLabel(net, currency))}</td>
      </tr>`;
  });

  const settlementRows = (balance?.pairwise || []).map(
    (p) => `
      <tr>
        <td>${escapeHtml(p.fromName || memberLabel(members, p.from))}</td>
        <td>pays</td>
        <td>${escapeHtml(p.toName || memberLabel(members, p.to))}</td>
        <td class="amt">${escapeHtml(formatMinor(p.amountMinor, currency))}</td>
      </tr>`
  );

  const periodLabel =
    period.from && period.to
      ? `${formatLongDate(period.from)} – ${formatLongDate(period.to)}`
      : 'No dated records yet';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(group.name)} · nSplit ledger</title>
  <style>
    @page { margin: 16mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 0; }
    .brand { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #6366F1; padding-bottom: 12px; margin-bottom: 16px; }
    .logo { font-size: 28px; font-weight: 800; color: #6366F1; letter-spacing: -0.03em; }
    .tag { color: #64748b; font-size: 11px; margin-top: 2px; }
    .doc { text-align: right; color: #64748b; font-size: 11px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { width: 100%; border-collapse: collapse; margin: 12px 0 20px; }
    .meta td { padding: 5px 8px 5px 0; vertical-align: top; }
    .k { color: #64748b; width: 110px; }
    h2 { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #6366F1; margin: 22px 0 8px; }
    table.grid { width: 100%; border-collapse: collapse; }
    table.grid th, table.grid td { border-bottom: 1px solid #e2e8f0; padding: 8px 6px; text-align: left; vertical-align: top; }
    table.grid th { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: #64748b; }
    .date { width: 92px; color: #64748b; white-space: nowrap; }
    .title { font-weight: 700; }
    .sub { color: #64748b; margin-top: 2px; font-size: 11px; }
    .amt { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 600; }
    .pos { color: #059669; }
    .neg { color: #e11d48; }
    .muted { color: #64748b; }
    .empty { color: #64748b; padding: 10px 0; }
    .foot { margin-top: 28px; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="brand">
    <div>
      <div class="logo">nSplit</div>
      <div class="tag">Split expenses. Settle cleanly.</div>
    </div>
    <div class="doc">
      Group ledger<br/>
      Generated ${escapeHtml(formatLongDate(generated))}
    </div>
  </div>

  <h1>${escapeHtml(getGroupEmoji(group.icon))} ${escapeHtml(group.name)}</h1>
  <table class="meta">
    <tr><td class="k">Group ID</td><td>${escapeHtml(group.code || group._id)}</td></tr>
    <tr><td class="k">Currency</td><td>${escapeHtml(currency)}</td></tr>
    <tr><td class="k">Period</td><td>${escapeHtml(periodLabel)}</td></tr>
    <tr><td class="k">Total spend</td><td>${escapeHtml(formatMinor(totalExpense, currency))}</td></tr>
    <tr><td class="k">Members</td><td>${members.length}</td></tr>
  </table>

  <h2>Ledger</h2>
  ${
    rows.length
      ? `<table class="grid">
          <thead><tr><th>Date</th><th>Particulars</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${rows.map((row) => row.html).join('')}</tbody>
        </table>`
      : `<div class="empty">No expenses or transfers in this group yet.</div>`
  }

  <h2>Member balances</h2>
  <table class="grid">
    <thead><tr><th>Member</th><th style="text-align:right">Paid</th><th style="text-align:right">Share</th><th style="text-align:right">Net</th></tr></thead>
    <tbody>${balanceRows.join('') || '<tr><td colspan="4" class="muted">No members</td></tr>'}</tbody>
  </table>

  <h2>Suggested settlements</h2>
  ${
    settlementRows.length
      ? `<table class="grid">
          <thead><tr><th>From</th><th></th><th>To</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${settlementRows.join('')}</tbody>
        </table>`
      : `<div class="empty">Everyone is settled up.</div>`
  }

  <div class="foot">Generated by nSplit · this is a group ledger, not a tax invoice.</div>
</body>
</html>`;
}

export async function shareGroupLedgerPdf(input: LedgerExportInput) {
  const html = buildGroupLedgerHtml(input);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const file = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `${input.group.name} · nSplit ledger`,
    });
    return;
  }
  await Print.printAsync({ html });
}

export async function printGroupLedgerPdf(input: LedgerExportInput) {
  const html = buildGroupLedgerHtml(input);
  await Print.printAsync({ html });
}
