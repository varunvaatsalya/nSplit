"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { getExpenseEmoji } from "@/lib/expense-icons";
import { formatLongDate, formatMinor, formatSignedMinor, memberName, toneClass } from "@/lib/format";
import { groupBalance } from "@/lib/group-balance";
import {
  buildGroupLedgerHtml,
  expenseDate,
  filterByRange,
  printLedger,
  transferDate,
} from "@/lib/ledger-export";
import { sortMembersByName } from "@/lib/members";
import { cn } from "@/lib/utils";

const PRESETS = [
  ["all", "All time"],
  ["month", "This month"],
  ["last-month", "Last month"],
  ["3m", "Last 3 months"],
  ["custom", "Custom"],
];

const PAGE = 15;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function toInputValue(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function fromInputValue(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function presetRange(preset) {
  const now = new Date();
  if (preset === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  if (preset === "last-month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (preset === "3m") return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: endOfDay(now) };
  return { from: null, to: null };
}

function SummaryItem({ label, value, wide }) {
  return (
    <div className={cn("px-3.5 py-2", wide ? "col-span-2" : "")}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 truncate font-bold">{value}</div>
    </div>
  );
}

export default function ExportPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [allExpenses, setAllExpenses] = useState([]);
  const [allTransfers, setAllTransfers] = useState([]);
  const [error, setError] = useState("");
  const [preset, setPreset] = useState("all");
  const [customFrom, setCustomFrom] = useState(() => startOfDay(new Date(Date.now() - 30 * 86400000)));
  const [customTo, setCustomTo] = useState(() => startOfDay(new Date()));
  const [visible, setVisible] = useState(PAGE);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [gRes, rRes] = await Promise.all([fetch(`/api/groups/${id}`), fetch(`/api/groups/${id}/records`)]);
      const [gJson, rJson] = await Promise.all([gRes.json(), rRes.json()]);
      if (cancelled) return;
      if (!gRes.ok || !rRes.ok) {
        setError(gJson?.error?.message || rJson?.error?.message || "Failed to load group");
        return;
      }
      setGroup({ ...gJson.data.group, members: sortMembersByName(gJson.data.group?.members || []) });
      setAllExpenses(rJson.data.expenses || []);
      setAllTransfers(rJson.data.transfers || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const range = useMemo(
    () => (preset === "custom" ? { from: startOfDay(customFrom), to: endOfDay(customTo) } : presetRange(preset)),
    [preset, customFrom, customTo],
  );
  const { expenses, transfers } = useMemo(
    () => filterByRange(allExpenses, allTransfers, range.from, range.to),
    [allExpenses, allTransfers, range],
  );
  const balance = useMemo(() => (group ? groupBalance(group, expenses, transfers) : null), [group, expenses, transfers]);

  // Same order as the PDF: oldest first.
  const rows = useMemo(
    () =>
      [
        ...expenses.map((e) => ({
          key: `e-${e._id}`,
          date: expenseDate(e) || new Date(0),
          emoji: getExpenseEmoji(e.icon, e.categoryKey),
          title: e.title || "Expense",
          amountMinor: e.amountMinor,
          transfer: false,
        })),
        ...transfers.map((t) => ({
          key: `t-${t._id}`,
          date: transferDate(t) || new Date(0),
          emoji: t.icon || "💸",
          title: t.title || "Transfer",
          amountMinor: t.amountMinor,
          transfer: true,
        })),
      ].sort((a, b) => a.date - b.date),
    [expenses, transfers],
  );

  if (error) return <p className="text-danger">{error}</p>;

  const currency = group?.currency || "INR";
  const scoped = preset !== "all";
  const totalSpend = expenses.reduce((sum, e) => sum + (e.amountMinor || 0), 0);
  const periodLabel =
    range.from && range.to
      ? `${formatLongDate(range.from)} – ${formatLongDate(range.to)}`
      : rows.length
        ? `${formatLongDate(rows[0].date)} – ${formatLongDate(rows[rows.length - 1].date)}`
        : "—";
  const memberById = Object.fromEntries((group?.members || []).map((m) => [m._id, m]));
  const balanceRows = (balance?.members || []).filter((m) => m.netMinor || m.paidMinor || m.owedMinor);

  function choosePreset(next) {
    setPreset(next);
    setVisible(PAGE);
  }

  function setDate(which, value) {
    const day = fromInputValue(value);
    if (!day) return;
    setVisible(PAGE);
    if (which === "from") {
      setCustomFrom(day);
      if (day > customTo) setCustomTo(day);
    } else {
      setCustomTo(day);
      if (day < customFrom) setCustomFrom(day);
    }
  }

  function exportPdf() {
    printLedger(buildGroupLedgerHtml({ group, expenses, transfers, balance, range: scoped ? range : undefined }));
  }

  async function copySummary() {
    const lines = [
      `${group.name} · ${periodLabel}`,
      `Total spend: ${formatMinor(totalSpend, currency)} (${rows.length} records)`,
      ...(balance?.pairwise || []).map(
        (p) => `${memberName(memberById[p.from])} pays ${memberName(memberById[p.to])} ${formatMinor(p.amountMinor, currency)}`,
      ),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const section = "mb-2 mt-4.5 text-[11px] font-bold tracking-[0.06em] text-muted";

  return (
    <div className="relative pb-28">
      <div className="mb-4 flex items-center gap-2">
        <Button type="button" size="icon" variant="ghost" asChild>
          <Link href={`/groups/${id}`} aria-label="Back to group">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-[22px] font-bold">Export details</h1>
      </div>

      {!group ? (
        <div className="space-y-3" aria-busy="true">
          <span className="block h-9 w-2/3 animate-pulse rounded-full bg-soft" />
          <span className="block h-24 animate-pulse rounded-2xl bg-soft" />
          <span className="block h-48 animate-pulse rounded-2xl bg-soft" />
        </div>
      ) : (
        <>
          <div className={cn(section, "mt-0")}>DATE RANGE</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => choosePreset(key)}
                className={cn(
                  "cursor-pointer rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors",
                  key === preset
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface hover:bg-soft",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {preset === "custom" ? (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {[
                ["from", "From", customFrom],
                ["to", "To", customTo],
              ].map(([which, label, value]) => (
                <label key={which} className="rounded-[14px] border border-border bg-surface p-3">
                  <span className="block text-[11px] text-muted">{label}</span>
                  <input
                    type="date"
                    value={toInputValue(value)}
                    max={toInputValue(new Date())}
                    onChange={(e) => setDate(which, e.target.value)}
                    className="mt-1 w-full bg-transparent font-bold outline-none"
                  />
                </label>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 rounded-2xl border border-border bg-surface py-1.5">
            <SummaryItem label="Period" value={periodLabel} wide />
            <SummaryItem label="Records" value={String(rows.length)} />
            <SummaryItem label="Total spend" value={formatMinor(totalSpend, currency)} />
          </div>

          <div className={section}>PREVIEW · LEDGER ({rows.length})</div>
          {rows.length ? (
            <div className="rounded-2xl border border-border bg-surface px-3">
              <ul className="divide-y divide-border">
                {rows.slice(0, visible).map((row) => (
                  <li key={row.key} className="flex items-center gap-2.5 py-2.5">
                    <span className="text-lg">{row.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{row.title}</div>
                      <div className="mt-px text-xs text-muted">
                        {formatLongDate(row.date)}
                        {row.transfer ? " · Payment" : ""}
                      </div>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums">{formatMinor(row.amountMinor, currency)}</span>
                  </li>
                ))}
              </ul>
              {rows.length > PAGE ? (
                <button
                  type="button"
                  onClick={() => setVisible((v) => (v >= rows.length ? PAGE : Math.min(v + 20, rows.length)))}
                  className="w-full cursor-pointer border-t border-border py-3 font-bold text-primary dark:text-primary-foreground"
                >
                  {visible >= rows.length ? "Show less" : `View more (${rows.length - visible} left)`}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface py-5 text-center text-sm text-muted">
              No expenses or payments in this period.
            </div>
          )}

          {balanceRows.length ? (
            <>
              <div className={section}>MEMBER BALANCES{scoped ? " · THIS PERIOD" : ""}</div>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface px-3">
                {balanceRows.map((m) => {
                  const member = memberById[m._id];
                  return (
                    <li key={m._id} className="flex items-center gap-2.5 py-2.5">
                      <UserAvatar
                        className="h-7 w-7"
                        fallbackClassName="text-[10px]"
                        name={memberName(member || m)}
                        avatar={member?.avatar || member?.user?.avatar}
                        seed={member?.userId || m._id}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{memberName(member || m)}</div>
                        <div className="mt-px truncate text-xs text-muted">
                          Paid {formatMinor(m.paidMinor || 0, currency)} · Share {formatMinor(m.owedMinor || 0, currency)}
                        </div>
                      </div>
                      <span className={cn("shrink-0 font-bold tabular-nums", toneClass(m.netMinor))}>
                        {formatSignedMinor(m.netMinor, currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          <p className="mt-3 text-center text-[11px] text-muted">
            The PDF also includes group details and suggested settlements.
          </p>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-3xl gap-2.5 px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 rounded-[14px] font-bold"
                disabled={!rows.length}
                onClick={copySummary}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy summary"}
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 rounded-[14px] font-bold"
                disabled={!rows.length}
                onClick={exportPdf}
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
