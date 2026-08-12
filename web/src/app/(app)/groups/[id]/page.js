"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { History, Settings } from "lucide-react";
import { AddRecordModal } from "@/components/records/add-record-modal";
import { GroupBalancePanel } from "@/components/groups/group-balance-panel";
import { GroupActivityDialog } from "@/components/groups/group-activity-dialog";
import { ExpenseDetailDialog } from "@/components/expenses/expense-detail-dialog";
import { Button } from "@/components/ui/button";
import { getExpenseEmoji } from "@/lib/expense-icons";
import { getGroupIcon } from "@/lib/group-options";
import { cn } from "@/lib/utils";

function formatMinor(minor, currency = "INR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format((minor || 0) / 100);
}

function dateHeaderLabel(date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();
}

function expenseDayKey(expense) {
  const raw = expense.expenseDate || expense.createdAt;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function groupExpensesByDate(expenses) {
  const map = new Map();
  for (const expense of expenses) {
    const key = expenseDayKey(expense);
    if (!map.has(key)) {
      const raw = expense.expenseDate || expense.createdAt;
      map.set(key, {
        key,
        date: new Date(raw),
        items: [],
      });
    }
    map.get(key).items.push(expense);
  }
  return [...map.values()].sort((a, b) => b.date - a.date);
}

function formatRowTime(expense) {
  const raw = expense.expenseDate || expense.createdAt;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (sameDay) return `Today ${time}`;
  return `${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} ${time}`;
}

function relativeCreated(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "created today";
  if (days === 1) return "created 1 day ago";
  if (days < 14) return `created ${days} days ago`;
  if (days < 60) return `created ${Math.floor(days / 7)} weeks ago`;
  return `created ${d.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
}

function payerLabel(expense, members) {
  const payers = expense.payers || [];
  if (!payers.length) return "Unknown";
  if (payers.length === 1) {
    const m = members.find((x) => x.id === payers[0].memberId);
    return m?.displayName || m?.user?.name || "Someone";
  }
  return `${payers.length} people`;
}

function creatorName(expense, members) {
  const m = members.find(
    (x) => x.userId && String(x.userId) === String(expense.createdById)
  );
  return m?.displayName || m?.user?.name || null;
}

function myShareLine(expense, myMemberId, currency) {
  if (!myMemberId) return null;
  const paid =
    (expense.payers || []).find((p) => p.memberId === myMemberId)
      ?.amountMinor || 0;
  const owed =
    (expense.splits || []).find((s) => s.memberId === myMemberId)
      ?.amountMinor || 0;
  const net = paid - owed;
  if (net === 0 && owed === 0 && paid === 0) return null;
  if (net > 0) {
    return {
      text: `You lent ${formatMinor(net, currency)}`,
      tone: "positive",
    };
  }
  if (net < 0) {
    return {
      text: `You owe ${formatMinor(-net, currency)}`,
      tone: "owes",
    };
  }
  return { text: "Settled for you", tone: "muted" };
}

export default function GroupDashboardPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [balance, setBalance] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("expenses");
  const [activityOpen, setActivityOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);

  async function load() {
    const [gRes, bRes, eRes, meRes] = await Promise.all([
      fetch(`/api/groups/${id}`),
      fetch(`/api/groups/${id}/balance`),
      fetch(`/api/groups/${id}/expenses`),
      fetch("/api/auth/me"),
    ]);
    const [gJson, bJson, eJson, meJson] = await Promise.all([
      gRes.json(),
      bRes.json(),
      eRes.json(),
      meRes.json(),
    ]);
    if (!gRes.ok) {
      setError(gJson?.error?.message || "Failed to load group");
      return;
    }
    setError("");
    setGroup(gJson.data.group);
    if (bRes.ok) setBalance(bJson.data);
    if (eRes.ok) setExpenses(eJson.data.expenses || []);
    if (meRes.ok) setMe(meJson.data.user);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const flatExpenses = useMemo(() => {
    const sections = groupExpensesByDate(expenses);
    return sections.flatMap((s) => s.items);
  }, [expenses]);

  const grouped = useMemo(() => groupExpensesByDate(expenses), [expenses]);
  const iconMeta = getGroupIcon(group?.icon);
  const members = group?.members || [];

  const showAddedBy = useMemo(() => {
    const ids = new Set(
      expenses.map((e) => String(e.createdById || "")).filter(Boolean)
    );
    return ids.size > 1;
  }, [expenses]);

  const myMember = useMemo(() => {
    if (!me?.id) return null;
    return members.find((m) => m.userId && String(m.userId) === String(me.id));
  }, [members, me]);

  function openExpense(expenseId) {
    const idx = flatExpenses.findIndex((e) => e.id === expenseId);
    if (idx < 0) return;
    setDetailIndex(idx);
    setDetailOpen(true);
  }

  if (error) return <p className="text-danger">{error}</p>;
  if (!group) return <p className="text-sm text-muted">Loading…</p>;

  const createdLabel = relativeCreated(group.createdAt);

  return (
    <div className="relative mx-auto max-w-3xl pb-24 md:pb-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-soft text-2xl">
            {iconMeta.emoji}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {group.name}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {members.length} member{members.length === 1 ? "" : "s"}
              {createdLabel ? ` · ${createdLabel}` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="rounded-full"
            onClick={() => setActivityOpen(true)}
            aria-label="Activity"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="rounded-full"
            asChild
          >
            <Link href={`/groups/${group.id}/settings`} aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-5 flex justify-start">
        <div className="inline-flex rounded-full bg-soft p-1">
          <button
            type="button"
            onClick={() => setView("expenses")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              view === "expenses"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setView("balance")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              view === "balance"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            Balance
          </button>
        </div>
      </div>

      {view === "balance" ? (
        <GroupBalancePanel
          balance={balance}
          currency={group.currency || "INR"}
        />
      ) : (
        <section>
          {grouped.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-12 text-center text-sm text-muted">
              Tap + to add an expense or transfer.
            </p>
          ) : (
            <div className="space-y-6">
              {grouped.map((section) => (
                <div key={section.key}>
                  <h3 className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-muted">
                    {Number.isNaN(section.date.getTime())
                      ? "UNKNOWN DATE"
                      : dateHeaderLabel(section.date)}
                  </h3>
                  <ul className="space-y-2.5">
                    {section.items.map((expense) => {
                      const paidBy = payerLabel(expense, members);
                      const added = creatorName(expense, members);
                      const share = myShareLine(
                        expense,
                        myMember?.id,
                        expense.currency || group.currency
                      );
                      return (
                        <li key={expense.id}>
                          <button
                            type="button"
                            onClick={() => openExpense(expense.id)}
                            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left transition-colors hover:border-primary/25 hover:bg-soft/30"
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft text-lg">
                              {getExpenseEmoji(
                                expense.icon,
                                expense.categoryKey
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold tracking-tight">
                                {expense.title}
                              </div>
                              <div className="truncate text-xs text-muted">
                                Paid by {paidBy} · {formatRowTime(expense)}
                              </div>
                              {showAddedBy && added ? (
                                <div className="truncate text-[11px] text-muted/80">
                                  Added by {added}
                                </div>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-semibold tabular-nums">
                                {formatMinor(
                                  expense.amountMinor,
                                  expense.currency || group.currency
                                )}
                              </div>
                              {share ? (
                                <div
                                  className={cn(
                                    "text-[11px] tabular-nums",
                                    share.tone === "positive" &&
                                      "text-positive",
                                    share.tone === "owes" && "text-owes",
                                    share.tone === "muted" && "text-muted"
                                  )}
                                >
                                  {share.text}
                                </div>
                              ) : null}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <AddRecordModal group={group} onCreated={load} />

      <GroupActivityDialog
        groupId={group.id}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />

      <ExpenseDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        expenses={flatExpenses}
        index={detailIndex}
        onIndexChange={setDetailIndex}
        group={group}
        showAddedBy={showAddedBy}
        currentUserId={me?.id}
      />
    </div>
  );
}
