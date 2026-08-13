"use client";

import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { getExpenseEmoji } from "@/lib/expense-icons";
import { cn } from "@/lib/utils";

const SPLIT_LABELS = {
  EQUAL: "Equally",
  EXACT: "As amount",
  SHARES: "As parts",
};

function formatMinor(minor, currency = "INR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format((minor || 0) / 100);
}

function memberById(members, id) {
  return members.find((m) => m.id === id);
}

function memberName(members, id) {
  const m = memberById(members, id);
  return m?.displayName || m?.user?.name || "Member";
}

function formatDetailWhen(expense) {
  const raw = expense.expenseDate || expense.createdAt;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ExpenseDetailDialog({
  open,
  onOpenChange,
  expenses = [],
  index = 0,
  onIndexChange,
  group,
  showAddedBy = false,
  currentUserId,
}) {
  const expense = expenses[index] || null;
  const members = group?.members || [];
  const currency = expense?.currency || group?.currency || "INR";
  const total = expenses.length;

  if (!expense) return null;

  const emoji = getExpenseEmoji(expense.icon, expense.categoryKey);
  const payers = expense.payers || [];
  const splits = (expense.splits || []).filter((s) => (s.amountMinor || 0) > 0);
  const creatorMember = members.find(
    (m) => m.userId && String(m.userId) === String(expense.createdById)
  );
  const creatorName =
    creatorMember?.displayName ||
    creatorMember?.user?.name ||
    "Someone";

  const myMember = members.find(
    (m) => m.userId && String(m.userId) === String(currentUserId)
  );

  function go(delta) {
    if (!total) return;
    const next = (index + delta + total) % total;
    onIndexChange?.(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[min(100vw-2rem,28rem)] gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">{expense.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Expense details with previous and next navigation.
        </DialogDescription>

        <div className="relative">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={total <= 1}
            className="absolute -left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-background shadow-lg disabled:opacity-40 sm:-left-14"
            aria-label="Previous expense"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={total <= 1}
            className="absolute -right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-background shadow-lg disabled:opacity-40 sm:-right-14"
            aria-label="Next expense"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="nsplit-scroll max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-surface shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">
                {emoji}
              </div>
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" disabled>
                  <Pencil className="h-4 w-4 text-muted" />
                </Button>
                <Button type="button" size="icon" variant="ghost" disabled>
                  <Trash2 className="h-4 w-4 text-muted" />
                </Button>
              </div>
            </div>

            <div className="px-5 pb-4 pt-3">
              <h2 className="text-xl font-semibold tracking-tight">
                {expense.title}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {formatDetailWhen(expense)}
              </p>
              <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
                {formatMinor(expense.amountMinor, currency)}
              </div>
            </div>

            <Separator />

            <div className="space-y-4 px-5 py-4">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Paid by
                </div>
                <ul className="space-y-2">
                  {payers.map((p) => {
                    const m = memberById(members, p.memberId);
                    const name = memberName(members, p.memberId);
                    return (
                      <li
                        key={p.memberId}
                        className="flex items-center gap-3 text-sm"
                      >
                        <UserAvatar
                          className="h-8 w-8"
                          name={name}
                          avatar={m?.avatar || m?.user?.avatar}
                          seed={m?.userId || m?.id || p.memberId}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{name}</div>
                          <div className="text-xs text-muted">
                            {payers.length === 1
                              ? "Paid full amount"
                              : "Paid part"}
                          </div>
                        </div>
                        <div className="tabular-nums font-medium">
                          {formatMinor(p.amountMinor, currency)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted">
                  <span>Split with ({splits.length})</span>
                  <span>{SPLIT_LABELS[expense.splitMethod] || expense.splitMethod}</span>
                </div>
                <ul className="space-y-1">
                  {splits.map((s) => {
                    const m = memberById(members, s.memberId);
                    const name = memberName(members, s.memberId);
                    const isYou = myMember && s.memberId === myMember.id;
                    return (
                      <li
                        key={s.memberId}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-2 py-2 text-sm",
                          isYou && "bg-primary/10"
                        )}
                      >
                        <UserAvatar
                          className="h-8 w-8"
                          name={name}
                          avatar={m?.avatar || m?.user?.avatar}
                          seed={m?.userId || m?.id || s.memberId}
                        />
                        <div className="min-w-0 flex-1 truncate font-medium">
                          {isYou ? "You" : name}
                        </div>
                        <div
                          className={cn(
                            "tabular-nums font-medium",
                            isYou && "text-primary"
                          )}
                        >
                          {formatMinor(s.amountMinor, currency)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {expense.description ? (
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Description
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {expense.description}
                  </p>
                </div>
              ) : null}
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-3 px-5 py-3 text-xs text-muted">
              <span>
                {showAddedBy
                  ? `Added by ${creatorName}`
                  : formatDetailWhen(expense)}
              </span>
              <span className="tabular-nums">
                {index + 1} / {total}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
