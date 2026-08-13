"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, isValid } from "date-fns";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  if (!isValid(d)) return "";
  return format(d, "MMM d · h:mm a");
}

export function ExpenseDetailDialog({
  open,
  onOpenChange,
  expenses = [],
  index = 0,
  onIndexChange,
  group,
  currentUserId,
  onEdit,
  onDeleted,
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const expense = expenses[index] || null;
  const members = group?.members || [];
  const currency = expense?.currency || group?.currency || "INR";
  const total = expenses.length;
  const canPrev = index > 0;
  const canNext = index < total - 1;

  function go(delta) {
    const next = index + delta;
    if (next < 0 || next >= total) return;
    onIndexChange?.(next);
  }

  useEffect(() => {
    if (!open || total <= 1) return;
    function onKeyDown(e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tag = e.target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        e.target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && !canPrev) return;
      if (e.key === "ArrowRight" && !canNext) return;
      e.preventDefault();
      go(e.key === "ArrowLeft" ? -1 : 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, total, canPrev, canNext]);

  async function confirmDelete() {
    if (!expense || !group?.id || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/groups/${group.id}/expenses/${expense.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) return;
      setConfirmDeleteOpen(false);
      onDeleted?.(expense);
    } finally {
      setDeleting(false);
    }
  }

  if (!expense) return null;

  const emoji = getExpenseEmoji(expense.icon, expense.categoryKey);
  const payers = expense.payers || [];
  const splits = (expense.splits || []).filter((s) => (s.amountMinor || 0) > 0);
  const creatorMember = members.find(
    (m) => m.userId && String(m.userId) === String(expense.createdById),
  );
  const creatorName =
    creatorMember?.displayName || creatorMember?.user?.name || "Someone";

  const myMember = members.find(
    (m) => m.userId && String(m.userId) === String(currentUserId),
  );

  return (
    <>
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
              disabled={!canPrev}
              className="absolute -left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center cursor-pointer rounded-full bg-foreground text-background shadow-lg disabled:opacity-40 sm:-left-14"
              aria-label="Previous expense"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={!canNext}
              className="absolute -right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center cursor-pointer rounded-full bg-foreground text-background shadow-lg disabled:opacity-40 sm:-right-14"
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
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Edit expense"
                    onClick={() => onEdit?.(expense)}
                    className="cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Delete expense"
                    disabled={deleting}
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
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

              <div className="space-y-4 px-5 py-3">
                <div className="border-b border-muted pb-2.5">
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
                    <span>
                      {SPLIT_LABELS[expense.splitMethod] || expense.splitMethod}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {splits.map((s) => {
                      const m = memberById(members, s.memberId);
                      const name = memberName(members, s.memberId);
                      const isYou = myMember && s.memberId === myMember.id;
                      return (
                        <li
                          key={s.memberId}
                          className={"flex items-center gap-3 rounded-xl py-1.5 text-sm"}
                        >
                          <UserAvatar
                            className="h-8 w-8"
                            name={name}
                            avatar={m?.avatar || m?.user?.avatar}
                            seed={m?.userId || m?.id || s.memberId}
                          />
                          <div className="min-w-0 flex-1 truncate font-medium">
                            {name} {isYou ? <span className="text-[11px]">(You)</span> : ""}
                          </div>
                          <div
                            className={cn(
                              "tabular-nums font-medium",
                              isYou && "text-primary",
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
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0">Added by</span>
                  <UserAvatar
                    className="h-5 w-5 shrink-0"
                    fallbackClassName="text-[8px]"
                    name={creatorName}
                    avatar={
                      creatorMember?.avatar || creatorMember?.user?.avatar
                    }
                    seed={
                      creatorMember?.userId ||
                      creatorMember?.id ||
                      expense.createdById
                    }
                  />
                  <span className="min-w-0 truncate">
                    · {formatDetailWhen(expense)}
                  </span>
                </div>
                <span className="shrink-0 tabular-nums">
                  {index + 1} / {total}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete expense?"
        description={`“${expense.title}” will be removed from this group. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
